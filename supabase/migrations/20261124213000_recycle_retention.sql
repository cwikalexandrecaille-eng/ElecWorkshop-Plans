alter table public.profiles add column purged_at timestamptz, add column purge_started_at timestamptz;
alter table public.documents add column draft_storage_path text;
alter policy documents_create on public.documents to authenticated
  with check ((select public.has_plan_permission('upload')) and uploader_id = (select auth.uid())
    and status = 'draft' and trashed_at is null and trashed_from_status is null and draft_storage_path is null
    and split_part(storage_path,'/',1) = cabinet_id::text and exists (
      select 1 from public.cabinets c join public.affairs a on a.id = c.affair_id
      where c.id = documents.cabinet_id and c.trashed_at is null and a.trashed_at is null
    ));

create table correction_internal.recycle_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('file','account')),
  bucket text not null default '',
  target text not null,
  claimed_until timestamptz,
  unique (kind,bucket,target)
);
revoke all on correction_internal.recycle_jobs from public, anon, authenticated;

create function correction_internal.prepare_recycle_purge()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_cutoff timestamptz := statement_timestamp() - interval '720 hours';
  v_affairs uuid[];
  v_cabinets uuid[];
  v_documents uuid[];
  v_annotations uuid[];
begin
  perform pg_catalog.pg_advisory_xact_lock(2324, 30);
  -- Lock ancestors first, in the same order as restoration and publication.
  perform 1 from public.affairs a where
    a.trashed_at <= v_cutoff or exists (
      select 1 from public.cabinets c where c.affair_id = a.id and
        (c.trashed_at <= v_cutoff or exists (
          select 1 from public.documents d where d.cabinet_id = c.id and d.status = 'trashed' and d.trashed_at <= v_cutoff
        ))
    ) order by a.id for update;
  v_affairs := array(select a.id from public.affairs a where a.trashed_at <= v_cutoff);
  perform 1 from public.cabinets c where
    c.trashed_at <= v_cutoff or c.affair_id = any(v_affairs) or exists (
      select 1 from public.documents d where d.cabinet_id = c.id and d.status = 'trashed' and d.trashed_at <= v_cutoff
    ) order by c.id for update;
  v_cabinets := array(select c.id from public.cabinets c where c.trashed_at <= v_cutoff or c.affair_id = any(v_affairs));
  v_documents := array(select d.id from public.documents d
    where (d.status = 'trashed' and d.trashed_at <= v_cutoff) or d.cabinet_id = any(v_cabinets) order by d.id for update);
  v_annotations := array(select a.id from public.annotations a where a.document_id = any(v_documents));

  insert into correction_internal.recycle_jobs(kind,bucket,target)
  select distinct 'file', candidate.bucket, candidate.path
  from (
    select case when d.status in ('published','archived') or d.published_at is not null
      or d.trashed_from_status in ('published','archived') then 'plans-public' else 'plans-drafts' end bucket, d.storage_path path
    from public.documents d where d.id = any(v_documents) and split_part(d.storage_path,'/',1) = d.cabinet_id::text
    union all select 'plans-drafts', d.draft_storage_path from public.documents d
    where d.id = any(v_documents) and split_part(d.draft_storage_path,'/',1) = d.cabinet_id::text
    union all
    select o.bucket_id, o.name from storage.objects o
    join unnest(v_cabinets) c(id) on split_part(o.name,'/',1) = c.id::text
    where o.bucket_id in ('plans-drafts','plans-public')
  ) candidate
  where candidate.path is not null and not exists (
    select 1 from public.documents d where d.id <> all(v_documents)
      and (d.storage_path = candidate.path or d.draft_storage_path = candidate.path)
  )
  on conflict(kind,bucket,target) do nothing;

  delete from public.notifications n where n.kind = 'correction_schema' and exists (
    select 1 from public.correction_requests r where r.document_id = any(v_documents)
      and n.url = '?correction=' || r.id::text
  );
  delete from public.reports where cabinet_id = any(v_cabinets) or document_id = any(v_documents)
    or annotation_id = any(v_annotations);
  delete from public.comments where annotation_id = any(v_annotations);
  delete from public.annotations where id = any(v_annotations);
  delete from public.documents where id = any(v_documents);
  delete from public.cabinets where id = any(v_cabinets);
  delete from public.affairs where id = any(v_affairs);

  with expired_profiles as (
    update public.profiles p set purge_started_at = statement_timestamp()
    where p.trashed_at <= v_cutoff and p.purge_started_at is null
      and p.purged_at is null and not p.active and p.role in ('referent','cableur','terrain')
    returning p.id
  )
  insert into correction_internal.recycle_jobs(kind,target)
    select 'account', p.id::text from expired_profiles p
    on conflict(kind,bucket,target) do nothing;
end;
$$;
revoke all on function correction_internal.prepare_recycle_purge() from public, anon, authenticated;

select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'ew_recycle_purge_token');

create function public.recycle_purge_batch(p_token text)
returns table(id uuid, kind text, bucket text, target text)
language plpgsql security invoker set search_path = '' as $$
begin
  return query select * from correction_internal.claim_recycle_jobs(p_token);
end;
$$;

create function correction_internal.claim_recycle_jobs(p_token text)
returns table(id uuid, kind text, bucket text, target text)
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or not exists (
    select 1 from vault.decrypted_secrets s where s.name = 'ew_recycle_purge_token'
      and extensions.digest(p_token,'sha256') = extensions.digest(s.decrypted_secret,'sha256')
  ) then raise exception 'Access denied' using errcode = '42501'; end if;

  perform correction_internal.prepare_recycle_purge();
  return query
  with pending as (
    select q.id from correction_internal.recycle_jobs q where q.claimed_until is null or q.claimed_until <= now()
      order by q.id limit 25 for update skip locked
  )
  update correction_internal.recycle_jobs q set claimed_until = now() + interval '10 minutes'
    from pending where q.id = pending.id returning q.id,q.kind,q.bucket,q.target;
end;
$$;

create function correction_internal.finish_recycle_job(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item correction_internal.recycle_jobs%rowtype;
begin
  select * into item from correction_internal.recycle_jobs where id = p_id for update;
  if not found then return; end if;
  if item.kind = 'account' then
    update public.profiles set purged_at = now(), username = null, permissions = array[]::text[],
      active_before_trash = null
      where id = item.target::uuid and not active and trashed_at <= now() - interval '720 hours';
    update public.affairs set referent_id = null where referent_id = item.target::uuid;
    delete from public.notifications where recipient_id = item.target::uuid;
  end if;
  delete from correction_internal.recycle_jobs where id = p_id;
end;
$$;

create function public.recycle_purge_finish(p_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select correction_internal.finish_recycle_job(p_id);
$$;

revoke all on function public.recycle_purge_batch(text), public.recycle_purge_finish(uuid),
  correction_internal.claim_recycle_jobs(text), correction_internal.finish_recycle_job(uuid)
  from public, anon, authenticated;
grant usage on schema correction_internal to service_role;
grant execute on function public.recycle_purge_batch(text), public.recycle_purge_finish(uuid),
  correction_internal.claim_recycle_jobs(text), correction_internal.finish_recycle_job(uuid) to service_role;

create or replace function correction_internal.set_trashed(p_kind text, p_id uuid, p_trash boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text := public.my_role();
  v_cabinet uuid;
  v_affair uuid;
  v_count integer;
  v_cutoff timestamptz := statement_timestamp() - interval '720 hours';
begin
  if p_kind is null or p_id is null or p_trash is null
    or p_kind not in ('account','affair','cabinet','document') then
    raise exception 'Élément de corbeille invalide.';
  end if;
  if v_role is null or v_role not in ('admin','chef') or (p_kind = 'account' and v_role <> 'admin') then
    raise exception 'Accès refusé.';
  end if;

  case p_kind
    when 'account' then
      update public.profiles set trashed_at = case when p_trash then now() end,
        active_before_trash = case when p_trash then active end,
        active = case when p_trash then false else coalesce(active_before_trash,true) end
      where id = p_id and id <> auth.uid() and purged_at is null and purge_started_at is null and role in ('referent','cableur','terrain')
        and (trashed_at is null) = p_trash and (p_trash or trashed_at > v_cutoff);
    when 'affair' then
      update public.affairs set trashed_at = case when p_trash then now() end
      where id = p_id and (trashed_at is null) = p_trash and (p_trash or trashed_at > v_cutoff);
    when 'cabinet' then
      select affair_id into v_affair from public.cabinets where id = p_id;
      perform 1 from public.affairs where id = v_affair and (p_trash or trashed_at is null) for update;
      if not found then raise exception 'Restaurez d’abord l’affaire.'; end if;
      update public.cabinets set trashed_at = case when p_trash then now() end
      where id = p_id and (trashed_at is null) = p_trash and (p_trash or trashed_at > v_cutoff) and affair_id = v_affair;
    when 'document' then
      select d.cabinet_id, c.affair_id into v_cabinet, v_affair
      from public.documents d join public.cabinets c on c.id = d.cabinet_id where d.id = p_id;
      perform 1 from public.affairs where id = v_affair and (p_trash or trashed_at is null) for update;
      if not found then raise exception 'Restaurez d’abord l’affaire.'; end if;
      perform 1 from public.cabinets where id = v_cabinet and (p_trash or trashed_at is null) for update;
      if not found then raise exception 'Restaurez d’abord l’armoire.'; end if;
      if p_trash then
        update public.documents set trashed_from_status = status, status = 'trashed', trashed_at = now()
        where id = p_id and cabinet_id = v_cabinet and status <> 'trashed';
      else
        update public.documents d set status = case
          when d.trashed_from_status = 'published' and exists (
            select 1 from public.documents current_doc where current_doc.cabinet_id = v_cabinet and current_doc.status = 'published'
          ) then 'archived'
          else coalesce(d.trashed_from_status,'draft')
          end, trashed_at = null, trashed_from_status = null
        where id = p_id and cabinet_id = v_cabinet and status = 'trashed' and trashed_at > v_cutoff;
      end if;
  end case;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Élément indisponible, arrivé à échéance ou déjà mis à jour.'; end if;
  insert into public.audit_logs(actor_id,action,entity,entity_id)
  values(auth.uid(),case when p_trash then 'trash' else 'restore' end,p_kind,p_id);
end;
$$;

create or replace function public.publish_document(p_id uuid, p_public_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cabinet uuid; v_affair uuid;
begin
  if not coalesce(public.my_role() in ('admin','chef'),false) then raise exception 'Accès refusé'; end if;
  select d.cabinet_id, c.affair_id into v_cabinet, v_affair from public.documents d
  join public.cabinets c on c.id = d.cabinet_id where d.id=p_id and d.status='draft';
  perform 1 from public.affairs where id=v_affair and trashed_at is null for update;
  if not found then raise exception 'Affaire indisponible'; end if;
  perform 1 from public.cabinets where id=v_cabinet and affair_id=v_affair and trashed_at is null for update;
  if not found then raise exception 'Armoire indisponible'; end if;
  perform 1 from public.documents where id=p_id and cabinet_id=v_cabinet and status='draft' for update;
  if not found then raise exception 'Brouillon introuvable'; end if;
  if p_public_path is distinct from v_cabinet::text || '/' || p_id::text || '.pdf' then raise exception 'Chemin invalide'; end if;
  if not exists(select 1 from storage.objects where bucket_id='plans-public' and name=p_public_path) then raise exception 'PDF public non transféré'; end if;
  update public.documents set status='archived' where cabinet_id=v_cabinet and status='published';
  update public.documents set status='published',draft_storage_path=storage_path,storage_path=p_public_path,published_by=auth.uid(),published_at=now() where id=p_id;
  insert into public.audit_logs(actor_id,action,entity,entity_id) values(auth.uid(),'publish','document',p_id);
end;
$$;

