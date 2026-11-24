create schema if not exists correction_internal;
revoke all on schema correction_internal from public;
grant usage on schema correction_internal to authenticated;

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  referent_id uuid not null references public.profiles(id),
  status text not null default 'unseen' check (status in ('unseen', 'progress', 'done')),
  pages jsonb not null check (jsonb_typeof(pages) = 'array'),
  submitted_at timestamptz not null default clock_timestamp(),
  unique (document_id, author_id)
);

create index correction_requests_referent on public.correction_requests(referent_id);
create index correction_requests_author on public.correction_requests(author_id);
alter table public.correction_requests enable row level security;
revoke all on public.correction_requests from public, anon, authenticated;
grant select on public.correction_requests to authenticated;
create policy correction_requests_read on public.correction_requests
  for select to authenticated using (
    (select public.is_staff()) and
    ((select auth.uid()) = author_id or (select auth.uid()) = referent_id)
  );

create function correction_internal.submit_corrections(p_document_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid := auth.uid();
  v_referent uuid;
  v_filename text;
  v_revision text;
  v_pages jsonb;
  v_request_id uuid;
begin
  if v_author is null or not public.is_staff() then
    raise exception 'Un compte actif est nécessaire.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_document_id::text || ':' || v_author::text, 0));
  select a.referent_id, d.filename, d.revision
    into v_referent, v_filename, v_revision
  from public.documents d
  join public.cabinets c on c.id = d.cabinet_id
  join public.affairs a on a.id = c.affair_id
  join public.profiles p on p.id = a.referent_id and p.active
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

create function correction_internal.set_correction_status(p_id uuid, p_status text, p_submitted_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Un compte actif est nécessaire.';
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

create function public.submit_corrections(p_document_id uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select correction_internal.submit_corrections(p_document_id);
$$;

create function public.set_correction_status(p_id uuid, p_status text, p_submitted_at timestamptz)
returns void language sql security invoker set search_path = '' as $$
  select correction_internal.set_correction_status(p_id, p_status, p_submitted_at);
$$;

revoke all on function correction_internal.submit_corrections(uuid), correction_internal.set_correction_status(uuid,text,timestamptz),
  public.submit_corrections(uuid), public.set_correction_status(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function correction_internal.submit_corrections(uuid), correction_internal.set_correction_status(uuid,text,timestamptz),
  public.submit_corrections(uuid), public.set_correction_status(uuid,text,timestamptz) to authenticated;

create or replace function public.notify_shared_annotation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  if new.visibility <> 'shared' or pg_catalog.starts_with(new.content, 'EW_DRAW_V1:') then return new; end if;
  select a.referent_id into recipient from public.documents d
  join public.cabinets c on c.id = d.cabinet_id
  join public.affairs a on a.id = c.affair_id where d.id = new.document_id;
  if recipient is not null and recipient <> new.author_id then
    insert into public.notifications(recipient_id, kind, body)
    values (recipient, 'annotation', 'Nouvelle annotation partagée, page ' || new.page);
  end if;
  return new;
end;
$$;
