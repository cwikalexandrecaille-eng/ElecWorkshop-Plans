create table public.notification_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 corrections boolean not null default true,
 feedback boolean not null default true,
 revisions boolean not null default true
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public,anon,authenticated;
grant select,insert,update on public.notification_preferences to authenticated;
create policy notification_preferences_own on public.notification_preferences for all to authenticated
 using (user_id=(select auth.uid()) and (select public.is_staff()))
 with check (user_id=(select auth.uid()) and (select public.is_staff()));

create table public.affair_followers (
 affair_id uuid not null references public.affairs(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(affair_id,user_id)
);
create index affair_followers_user on public.affair_followers(user_id);
alter table public.affair_followers enable row level security;
revoke all on public.affair_followers from public,anon,authenticated;
grant select,insert,delete on public.affair_followers to authenticated;
create policy affair_followers_own on public.affair_followers for all to authenticated
 using (user_id=(select auth.uid()) and (select public.is_staff()))
 with check (user_id=(select auth.uid()) and (select public.is_staff()) and exists(
 select 1 from public.affairs a where a.id=affair_id and a.trashed_at is null));

create table correction_internal.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 endpoint text unique not null,
 p256dh text not null,
 auth text not null
);
create index push_subscription_user on correction_internal.push_subscriptions(user_id);
create index push_subscription_session on correction_internal.push_subscriptions(session_id);
create table correction_internal.push_queue (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.notifications(id) on delete cascade,
 subscription_id uuid not null references correction_internal.push_subscriptions(id) on delete cascade,
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '1 hour',
 unique(notification_id,subscription_id)
);
create index push_queue_due on correction_internal.push_queue(next_attempt_at);
create table correction_internal.push_nonces(id uuid primary key,created_at timestamptz not null default now());
revoke all on correction_internal.push_subscriptions,correction_internal.push_queue,correction_internal.push_nonces from public,anon,authenticated;

create function correction_internal.register_push(p_endpoint text,p_p256dh text,p_auth text)
returns void language plpgsql security definer set search_path='' as $$
declare sid uuid:=(auth.jwt()->>'session_id')::uuid;
begin
 if not public.is_staff() or sid is null or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=auth.uid()
 and (s.not_after is null or s.not_after>now())) then raise exception 'Session indisponible.'; end if;
 if char_length(p_endpoint)>3000 or p_endpoint !~ '^https://([a-zA-Z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|notify\.windows\.com)/[^[:space:]#]*$'
 or p_endpoint is null or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{22}$'
 then raise exception 'Abonnement aux notifications invalide.'; end if;
 insert into correction_internal.push_subscriptions(user_id,session_id,endpoint,p256dh,auth)
 values(auth.uid(),sid,p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set user_id=excluded.user_id,session_id=excluded.session_id,
 p256dh=excluded.p256dh,auth=excluded.auth;
 -- A previous account's queued messages must not follow this device.
 delete from correction_internal.push_queue q using correction_internal.push_subscriptions s,public.notifications n
 where q.subscription_id=s.id and q.notification_id=n.id and s.endpoint=p_endpoint and n.recipient_id<>s.user_id;
end;
$$;
create function correction_internal.unregister_push(p_endpoint text)
returns void language sql security definer set search_path='' as $$
 delete from correction_internal.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint;
$$;
create function public.register_push(p_endpoint text,p_p256dh text,p_auth text)
returns void language sql security invoker set search_path='' as $$
 select correction_internal.register_push(p_endpoint,p_p256dh,p_auth);
$$;
create function public.unregister_push(p_endpoint text)
returns void language sql security invoker set search_path='' as $$
 select correction_internal.unregister_push(p_endpoint);
$$;
revoke all on function correction_internal.register_push(text,text,text),correction_internal.unregister_push(text),
 public.register_push(text,text,text),public.unregister_push(text) from public,anon,authenticated;
grant execute on function correction_internal.register_push(text,text,text),correction_internal.unregister_push(text),
 public.register_push(text,text,text),public.unregister_push(text) to authenticated;

create function correction_internal.push_allowed(p_user uuid,p_kind text)
returns boolean language sql stable set search_path='' as $$
 select coalesce((select case p_kind when 'correction_schema' then p.corrections
 when 'correction_feedback' then p.feedback when 'revision_published' then p.revisions else false end
 from public.notification_preferences p where p.user_id=p_user),
 p_kind in ('correction_schema','correction_feedback','revision_published')) or p_kind='push_test';
$$;
create function correction_internal.queue_push()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if correction_internal.push_allowed(new.recipient_id,new.kind) then
 insert into correction_internal.push_queue(notification_id,subscription_id)
 select new.id,s.id from correction_internal.push_subscriptions s join public.profiles p on p.id=s.user_id and p.active
 where s.user_id=new.recipient_id and (new.kind<>'push_test' or s.session_id=(auth.jwt()->>'session_id')::uuid);
 end if;
 return new;
end;
$$;
create trigger notification_push_queue after insert on public.notifications for each row execute function correction_internal.queue_push();

create function correction_internal.notify_revision()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and old.status is distinct from 'published' then
 insert into public.notifications(recipient_id,kind,body,url)
 select p.id,'revision_published','Nouvelle révision · '||new.filename||' · Rév. '||new.revision,'?document='||new.id::text
 from public.profiles p where p.active and p.id is distinct from new.published_by and exists(
 select 1 from public.affair_followers f join public.cabinets c on c.affair_id=f.affair_id
 where c.id=new.cabinet_id and f.user_id=p.id);
 end if;
 return new;
end;
$$;
create trigger revision_published_notice after update of status on public.documents for each row execute function correction_internal.notify_revision();

create function correction_internal.push_claim(p_nonce uuid,p_timestamp bigint,p_signature text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_now bigint:=extract(epoch from statement_timestamp())::bigint; result jsonb;
begin
 if p_nonce is null or p_timestamp is null or p_timestamp not between v_now-90 and v_now+15 or not exists(
 select 1 from vault.decrypted_secrets s where s.name='ew_push_signing'
 and p_signature=encode(extensions.hmac(p_nonce::text||':'||p_timestamp::text,s.decrypted_secret,'sha256'),'hex'))
 then raise exception 'Access denied' using errcode='42501'; end if;
 delete from correction_internal.push_nonces where created_at<now()-interval '5 minutes';
 insert into correction_internal.push_nonces(id) values(p_nonce) on conflict do nothing;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 delete from correction_internal.push_queue q where q.expires_at<=now() or q.attempts>=8 or not exists(
 select 1 from correction_internal.push_subscriptions s join auth.sessions a on a.id=s.session_id
 join public.profiles p on p.id=s.user_id
 join public.notifications n on n.id=q.notification_id and n.recipient_id=s.user_id
 where s.id=q.subscription_id and p.active and (a.not_after is null or a.not_after>now())
 and correction_internal.push_allowed(s.user_id,n.kind));
 with pending as (select q.id from correction_internal.push_queue q where q.next_attempt_at<=now()
 order by q.next_attempt_at limit 20 for update skip locked),
 claimed as(update correction_internal.push_queue q set attempts=attempts+1,next_attempt_at=now()+interval '2 minutes'
 from pending where q.id=pending.id returning q.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'subscription',s.id,'endpoint',s.endpoint,
 'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth),
 'kind',n.kind,'url',n.url,'notice',n.id)), '[]'::jsonb) into result
 from claimed q join correction_internal.push_subscriptions s on s.id=q.subscription_id
 join public.notifications n on n.id=q.notification_id;
 return jsonb_build_object('jobs',result,'publicKey',(select decrypted_secret from vault.decrypted_secrets where name='ew_push_public'),
 'privateKey',(select decrypted_secret from vault.decrypted_secrets where name='ew_push_private'));
end;
$$;
create function public.push_claim(p_nonce uuid,p_timestamp bigint,p_signature text)
returns jsonb language sql security invoker set search_path='' as $$
 select correction_internal.push_claim(p_nonce,p_timestamp,p_signature);
$$;
create function correction_internal.push_finish(p_id uuid,p_gone boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_gone then delete from correction_internal.push_subscriptions where id=(select subscription_id from correction_internal.push_queue where id=p_id);
 else delete from correction_internal.push_queue where id=p_id; end if;
end;
$$;
create function public.push_finish(p_id uuid,p_gone boolean)
returns void language sql security invoker set search_path='' as $$
 select correction_internal.push_finish(p_id,p_gone);
$$;
create function correction_internal.push_public_key() returns text language sql stable security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='ew_push_public' and public.is_staff();
$$;
create function public.push_public_key() returns text language sql stable security invoker set search_path='' as $$
 select correction_internal.push_public_key();
$$;
revoke all on function correction_internal.push_allowed(uuid,text),correction_internal.queue_push(),correction_internal.notify_revision(),
 correction_internal.push_claim(uuid,bigint,text),public.push_claim(uuid,bigint,text),correction_internal.push_finish(uuid,boolean),
 public.push_finish(uuid,boolean),correction_internal.push_public_key(),public.push_public_key() from public,anon,authenticated;
grant execute on function correction_internal.push_public_key(),public.push_public_key() to authenticated;
grant execute on function correction_internal.push_claim(uuid,bigint,text),public.push_claim(uuid,bigint,text),
 correction_internal.push_finish(uuid,boolean),public.push_finish(uuid,boolean) to service_role;

create function correction_internal.test_push() returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_staff() or not exists(select 1 from correction_internal.push_subscriptions s
 where s.user_id=auth.uid() and s.session_id=(auth.jwt()->>'session_id')::uuid)
 then raise exception 'Active d’abord les notifications sur cet appareil.'; end if;
 if exists(select 1 from public.notifications where recipient_id=auth.uid() and kind='push_test' and created_at>now()-interval '1 minute')
 then raise exception 'Attends une minute avant un nouveau test.'; end if;
 insert into public.notifications(recipient_id,kind,body,url)
 values(auth.uid(),'push_test','Test des notifications sur ton appareil.','/');
end;
$$;
create function public.test_push() returns void language sql security invoker set search_path='' as $$
 select correction_internal.test_push();
$$;
revoke all on function correction_internal.test_push(),public.test_push() from public,anon,authenticated;
grant execute on function correction_internal.test_push(),public.test_push() to authenticated;
