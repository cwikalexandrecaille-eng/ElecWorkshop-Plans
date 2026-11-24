alter table public.correction_requests
  add column review_comment text check (char_length(review_comment) <= 500),
  add column reviewed_at timestamptz;

create function correction_internal.reset_correction_feedback()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.review_comment := null;
  new.reviewed_at := null;
  return new;
end;
$$;

create trigger correction_feedback_reset before update of submitted_at on public.correction_requests
for each row when (old.submitted_at is distinct from new.submitted_at)
execute function correction_internal.reset_correction_feedback();

create function correction_internal.remove_correction_feedback_notices()
returns trigger language plpgsql set search_path = '' as $$
begin
  delete from public.notifications
  where kind = 'correction_feedback' and url = '?correction=' || old.id::text;
  return old;
end;
$$;

create trigger correction_feedback_cleanup after delete on public.correction_requests
for each row execute function correction_internal.remove_correction_feedback_notices();

create function correction_internal.set_correction_status(
  p_id uuid, p_status text, p_submitted_at timestamptz, p_comment text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_request public.correction_requests%rowtype;
  v_comment text;
  v_filename text;
  v_revision text;
  v_label text;
begin
  if auth.uid() is null or not correction_internal.has_plan_permission('review') then
    raise exception 'Ce compte ne peut pas traiter les corrections.';
  end if;
  v_label := case p_status
    when 'unseen' then 'Pas encore vu' when 'progress' then 'En cours' when 'done' then 'Réalisé' end;
  if v_label is null then raise exception 'Statut de correction invalide.'; end if;

  select r.* into v_request from public.correction_requests r
  join public.documents d on d.id = r.document_id and d.status <> 'trashed'
  join public.cabinets c on c.id = d.cabinet_id and c.trashed_at is null
  join public.affairs a on a.id = c.affair_id and a.trashed_at is null
  where r.id = p_id and r.referent_id = auth.uid() and r.submitted_at = p_submitted_at
  for update of r;
  if not found then
    raise exception 'Demande indisponible ou mise à jour. Rouvre-la pour consulter les dernières corrections.';
  end if;

  v_comment := case when p_comment is null then v_request.review_comment
    else nullif(btrim(p_comment, E' \t\n\r'), '') end;
  if char_length(v_comment) > 500 then raise exception 'Le commentaire est limité à 500 caractères.'; end if;
  if p_status = v_request.status and v_comment is not distinct from v_request.review_comment then return; end if;

  update public.correction_requests
    set status = p_status, review_comment = v_comment, reviewed_at = clock_timestamp()
    where id = p_id;

  if v_request.author_id <> auth.uid() and exists (
    select 1 from public.profiles p where p.id = v_request.author_id and p.active
  ) then
    select d.filename,d.revision into v_filename,v_revision
    from public.documents d where d.id = v_request.document_id;
    insert into public.notifications(recipient_id,kind,body,url)
    values(v_request.author_id,'correction_feedback',
      v_label || ' · ' || v_filename || ' · Rév. ' || v_revision ||
        coalesce(' · ' || v_comment,''),
      '?correction=' || p_id::text);
  end if;
end;
$$;

create or replace function correction_internal.set_correction_status(p_id uuid, p_status text, p_submitted_at timestamptz)
returns void language sql security invoker set search_path = '' as $$
  select correction_internal.set_correction_status(p_id,p_status,p_submitted_at,null::text);
$$;

create function public.set_correction_status(p_id uuid, p_status text, p_submitted_at timestamptz, p_comment text)
returns void language sql security invoker set search_path = '' as $$
  select correction_internal.set_correction_status(p_id,p_status,p_submitted_at,p_comment);
$$;

revoke all on function correction_internal.reset_correction_feedback(), correction_internal.remove_correction_feedback_notices(),
  correction_internal.set_correction_status(uuid,text,timestamptz,text), public.set_correction_status(uuid,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function correction_internal.set_correction_status(uuid,text,timestamptz,text),
  public.set_correction_status(uuid,text,timestamptz,text) to authenticated;
