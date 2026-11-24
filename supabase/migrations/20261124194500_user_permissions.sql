alter table public.profiles
  add column username text unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  add column permissions text[] check (
    permissions <@ array['folders','upload','annotate','send','review']::text[]
    and array_position(permissions, null) is null
  );

grant select, insert, update on public.profiles to service_role;

create function correction_internal.plan_permission(p_role text, p_permissions text[], p_permission text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(case
    when p_role in ('admin','chef') then true
    when p_permissions is not null then p_permission = any(p_permissions)
    when p_permission in ('annotate','send') then p_role in ('referent','cableur','terrain')
    when p_permission in ('folders','upload') then p_role in ('referent','cableur')
    when p_permission = 'review' then p_role = 'referent'
    else false
  end, false);
$$;

create function correction_internal.has_plan_permission(p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select correction_internal.plan_permission(p.role, p.permissions, p_permission)
    from public.profiles p where p.id = auth.uid() and p.active
  ), false);
$$;

create function public.has_plan_permission(p_permission text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select correction_internal.has_plan_permission(p_permission);
$$;

revoke all on function correction_internal.plan_permission(text,text[],text),
  correction_internal.has_plan_permission(text), public.has_plan_permission(text) from public, anon, authenticated;
grant execute on function correction_internal.has_plan_permission(text), public.has_plan_permission(text) to authenticated;

alter policy clients_create on public.clients to authenticated with check ((select public.has_plan_permission('folders')));
alter policy endclients_create on public.end_clients to authenticated with check ((select public.has_plan_permission('folders')));
alter policy affairs_create on public.affairs to authenticated with check ((select public.has_plan_permission('folders')));
alter policy affairs_update on public.affairs to authenticated
  using ((select public.my_role()) in ('admin','chef')) with check ((select public.my_role()) in ('admin','chef'));
alter policy cabinets_create on public.cabinets to authenticated with check ((select public.has_plan_permission('folders')));
alter policy cabinets_update on public.cabinets to authenticated
  using ((select public.has_plan_permission('folders'))) with check ((select public.has_plan_permission('folders')));

alter policy documents_create on public.documents to authenticated
  with check ((select public.has_plan_permission('upload')) and uploader_id = (select auth.uid()) and status = 'draft');
alter policy drafts_upload on storage.objects to authenticated
  with check (bucket_id = 'plans-drafts' and (select public.has_plan_permission('upload')));
alter policy published_upload on storage.objects to authenticated
  with check (bucket_id = 'plans-public' and (select public.my_role()) in ('admin','chef'));
alter policy drafts_delete on storage.objects to authenticated
  using (bucket_id = 'plans-drafts' and (select public.my_role()) in ('admin','chef'));

alter policy annotations_create on public.annotations to authenticated
  with check ((select public.has_plan_permission('annotate')) and author_id = (select auth.uid()));
alter policy annotations_update on public.annotations to authenticated
  using ((select public.my_role()) in ('admin','chef') or
    ((select public.has_plan_permission('annotate')) and author_id = (select auth.uid())))
  with check ((select public.my_role()) in ('admin','chef') or
    ((select public.has_plan_permission('annotate')) and author_id = (select auth.uid())));
alter policy comments_create on public.comments to authenticated
  with check ((select public.has_plan_permission('annotate')) and author_id = (select auth.uid()) and
    exists (select 1 from public.annotations a where a.id = comments.annotation_id and
      (a.visibility = 'shared' or a.author_id = (select auth.uid()))));

alter policy reports_create on public.reports to authenticated
  with check ((select public.has_plan_permission('send')) and author_id = (select auth.uid()) and
    referent_id is not distinct from (
      select a.referent_id from public.affairs a join public.cabinets c on c.affair_id = a.id
      where c.id = reports.cabinet_id
    ) and (document_id is null or exists (
      select 1 from public.documents d where d.id = reports.document_id and d.cabinet_id = reports.cabinet_id
    )));
alter policy reports_update on public.reports to authenticated
  using ((select public.my_role()) in ('admin','chef') or
    ((select public.has_plan_permission('review')) and referent_id = (select auth.uid())))
  with check ((select public.my_role()) in ('admin','chef') or
    ((select public.has_plan_permission('review')) and referent_id = (select auth.uid())));
revoke update on public.reports from authenticated;
grant update (status) on public.reports to authenticated;

-- Keep the existing RPC interfaces and constrain publication to workshop administrators.
create or replace function public.publish_document(p_id uuid, p_public_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cabinet uuid;
begin
  if not coalesce(public.my_role() in ('admin','chef'),false) then raise exception 'Accès refusé'; end if;
  select cabinet_id into v_cabinet from public.documents where id=p_id and status='draft' for update;
  if v_cabinet is null then raise exception 'Brouillon introuvable'; end if;
  if p_public_path is distinct from v_cabinet::text || '/' || p_id::text || '.pdf' then raise exception 'Chemin invalide'; end if;
  if not exists(select 1 from storage.objects where bucket_id='plans-public' and name=p_public_path) then raise exception 'PDF public non transféré'; end if;
  update public.documents set status='archived' where cabinet_id=v_cabinet and status='published';
  update public.documents set status='published',storage_path=p_public_path,published_by=auth.uid(),published_at=now() where id=p_id;
  insert into public.audit_logs(actor_id,action,entity,entity_id) values(auth.uid(),'publish','document',p_id);
end;
$$;

create or replace function public.trash_draft(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.my_role() in ('admin','chef'),false) then raise exception 'Accès refusé'; end if;
  update public.documents set status='trashed',trashed_at=now() where id=p_id and status='draft';
  if not found then raise exception 'Brouillon introuvable'; end if;
  insert into public.audit_logs(actor_id,action,entity,entity_id) values(auth.uid(),'trash','document',p_id);
end;
$$;

create or replace function correction_internal.submit_corrections(p_document_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid := auth.uid();
  v_referent uuid;
  v_filename text;
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
  where d.id = p_document_id and d.trashed_at is null;

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

  insert into public.correction_requests as r (document_id, author_id, referent_id, pages)
  values (p_document_id, v_author, v_referent, v_pages)
  on conflict (document_id, author_id) do update
    set referent_id = excluded.referent_id, pages = excluded.pages,
        status = 'unseen', submitted_at = clock_timestamp()
  where r.pages is distinct from excluded.pages or r.referent_id is distinct from excluded.referent_id
  returning id into v_request_id;

  if v_request_id is null then
    return null;
  end if;

  insert into public.notifications (recipient_id, kind, body, url)
  values (v_referent, 'correction_schema',
    'Schéma modifié · ' || v_filename || ' · Rév. ' || v_revision,
    '?correction=' || v_request_id::text);
  return v_request_id;
end;
$$;

create or replace function correction_internal.set_correction_status(p_id uuid, p_status text, p_submitted_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not correction_internal.has_plan_permission('review') then
    raise exception 'Ce compte ne peut pas traiter les corrections.';
  end if;
  if p_status is null or p_status not in ('unseen', 'progress', 'done') then
    raise exception 'Statut de correction invalide.';
  end if;
  update public.correction_requests
    set status = p_status
  where id = p_id and referent_id = auth.uid() and submitted_at = p_submitted_at;
  if not found then
    raise exception 'Demande indisponible ou mise à jour. Rouvre-la pour consulter les dernières corrections.';
  end if;
end;
$$;

