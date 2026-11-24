alter table public.affairs add column trashed_at timestamptz;
alter table public.cabinets add column trashed_at timestamptz;
alter table public.profiles add column trashed_at timestamptz,
  add column active_before_trash boolean,
  add constraint trashed_profile_inactive check (trashed_at is null or not active);
alter table public.documents add column trashed_from_status text
  check (trashed_from_status in ('draft','published','archived'));

alter table public.correction_requests add column author_name text;
update public.correction_requests r set author_name = p.full_name
  from public.profiles p where p.id = r.author_id;

alter policy affairs_read on public.affairs to authenticated
  using ((select public.is_staff()) and (trashed_at is null or (select public.my_role()) in ('admin','chef')));
alter policy cabinets_read on public.cabinets to authenticated
  using ((select public.is_staff()) and (
    (select public.my_role()) in ('admin','chef') or
    (trashed_at is null and exists (
      select 1 from public.affairs a where a.id = cabinets.affair_id and a.trashed_at is null
    ))
  ));
alter policy documents_read on public.documents to authenticated
  using ((select public.is_staff()) and (
    (select public.my_role()) in ('admin','chef') or
    (status <> 'trashed' and exists (
      select 1 from public.cabinets c where c.id = documents.cabinet_id and c.trashed_at is null
    ))
  ));
alter policy affairs_create on public.affairs to authenticated
  with check ((select public.has_plan_permission('folders')) and trashed_at is null);
revoke update on public.affairs, public.cabinets, public.profiles from authenticated;
grant update (client_id,end_client_id,year,name,referent_id) on public.affairs to authenticated;
grant update (affair_id,name,public_token) on public.cabinets to authenticated;
grant update (full_name,role,permissions,username,active) on public.profiles to authenticated;

alter policy cabinets_create on public.cabinets to authenticated
  with check ((select public.has_plan_permission('folders')) and trashed_at is null and exists (
    select 1 from public.affairs a where a.id = cabinets.affair_id and a.trashed_at is null
  ));
alter policy documents_create on public.documents to authenticated
  with check ((select public.has_plan_permission('upload')) and uploader_id = (select auth.uid())
    and status = 'draft' and trashed_at is null and trashed_from_status is null and exists (
      select 1 from public.cabinets c join public.affairs a on a.id = c.affair_id
      where c.id = documents.cabinet_id and c.trashed_at is null and a.trashed_at is null
    ));
alter policy notifications_read on public.notifications to authenticated
  using ((select public.is_staff()) and recipient_id = (select auth.uid()));
alter policy notifications_update on public.notifications to authenticated
  using ((select public.is_staff()) and recipient_id = (select auth.uid()))
  with check ((select public.is_staff()) and recipient_id = (select auth.uid()));

-- All trash and restore operations use the same authorization and audit path.
create function correction_internal.set_trashed(p_kind text, p_id uuid, p_trash boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text := public.my_role();
  v_cabinet uuid;
  v_affair uuid;
  v_count integer;
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
      where id = p_id and id <> auth.uid() and role in ('referent','cableur','terrain')
        and (trashed_at is null) = p_trash;
    when 'affair' then
      update public.affairs set trashed_at = case when p_trash then now() end
      where id = p_id and (trashed_at is null) = p_trash;
    when 'cabinet' then
      select affair_id into v_affair from public.cabinets where id = p_id;
      perform 1 from public.affairs where id = v_affair and (p_trash or trashed_at is null) for update;
      if not found then raise exception 'Restaurez d’abord l’affaire.'; end if;
      update public.cabinets set trashed_at = case when p_trash then now() end
      where id = p_id and (trashed_at is null) = p_trash and affair_id = v_affair;
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
        where id = p_id and cabinet_id = v_cabinet and status = 'trashed';
      end if;
  end case;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Élément indisponible ou déjà mis à jour.'; end if;
  insert into public.audit_logs(actor_id,action,entity,entity_id)
  values(auth.uid(),case when p_trash then 'trash' else 'restore' end,p_kind,p_id);
end;
$$;

create function public.set_trashed(p_kind text, p_id uuid, p_trash boolean)
returns void language sql security invoker set search_path = '' as $$
  select correction_internal.set_trashed(p_kind,p_id,p_trash);
$$;
revoke all on function correction_internal.set_trashed(text,uuid,boolean), public.set_trashed(text,uuid,boolean)
  from public, anon, authenticated;
grant execute on function correction_internal.set_trashed(text,uuid,boolean), public.set_trashed(text,uuid,boolean)
  to authenticated;

create or replace function public.trash_draft(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform correction_internal.set_trashed('document',p_id,true);
end;
$$;

create or replace function public.public_cabinet(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name',c.name,'affair',a.name,'year',a.year,
     'documents',coalesce((
       select jsonb_agg(jsonb_build_object('name',d.filename,'revision',d.revision,'path',d.storage_path) order by d.published_at desc)
       from public.documents d where d.cabinet_id = c.id and d.status = 'published'
     ),'[]'::jsonb))
  from public.cabinets c join public.affairs a on a.id = c.affair_id
  where c.public_token = p_token and c.trashed_at is null and a.trashed_at is null;
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
  update public.documents set status='published',storage_path=p_public_path,published_by=auth.uid(),published_at=now() where id=p_id;
  insert into public.audit_logs(actor_id,action,entity,entity_id) values(auth.uid(),'publish','document',p_id);
end;
$$;

create or replace function correction_internal.submit_corrections(p_document_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid := auth.uid();
  v_referent uuid;
  v_filename text;
  v_author_name text;
  v_revision text;
  v_pages jsonb;
  v_request_id uuid;
begin
  if v_author is null or not correction_internal.has_plan_permission('send') then
    raise exception 'Ce compte ne peut pas envoyer de corrections.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_document_id::text || ':' || v_author::text, 0));
  select a.referent_id, d.filename, d.revision
    into v_referent, v_filename, v_revision
  from public.documents d
  join public.cabinets c on c.id = d.cabinet_id
  join public.affairs a on a.id = c.affair_id
  join public.profiles p on p.id = a.referent_id and p.active
    and correction_internal.plan_permission(p.role, p.permissions, 'review')
  where d.id = p_document_id and d.status <> 'trashed' and c.trashed_at is null and a.trashed_at is null;

  if v_referent is null then
    raise exception 'Aucun référent actif n’est affecté à cette affaire.';
  end if;

  select jsonb_agg(jsonb_build_object('page', a.page, 'content', a.content) order by a.page, a.id)
    into v_pages
  from public.annotations a
  where a.document_id = p_document_id and a.author_id = v_author
    and a.visibility = 'shared' and pg_catalog.starts_with(a.content, 'EW_DRAW_V1:[') and right(a.content, 1) = ']'
    and a.content <> 'EW_DRAW_V1:[]';

  if v_pages is null then
    raise exception 'Enregistre au moins une correction en visibilité Partagée avant l’envoi.';
  end if;

  select coalesce(nullif(btrim(p.full_name),''), p.username, 'Utilisateur') into v_author_name
  from public.profiles p where p.id = v_author;

  insert into public.correction_requests as r (document_id, author_id, referent_id, pages, author_name)
  values (p_document_id, v_author, v_referent, v_pages, v_author_name)
  on conflict (document_id, author_id) do update
    set referent_id = excluded.referent_id, pages = excluded.pages,
        status = 'unseen', submitted_at = clock_timestamp(), author_name = excluded.author_name
  where r.pages is distinct from excluded.pages or r.referent_id is distinct from excluded.referent_id
  returning id into v_request_id;

  if v_request_id is null then
    return null;
  end if;

  insert into public.notifications (recipient_id, kind, body, url)
  values (v_referent, 'correction_schema',
    'Schéma modifié · ' || v_filename || ' · Rév. ' || v_revision || ' · Envoyé par ' || v_author_name,
    '?correction=' || v_request_id::text);
  return v_request_id;
end;
$$;

