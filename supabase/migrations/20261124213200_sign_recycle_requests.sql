drop function public.recycle_purge_batch(text);
drop function correction_internal.claim_recycle_jobs(text);

select vault.update_secret(id,encode(extensions.gen_random_bytes(32),'hex'))
from vault.decrypted_secrets where name = 'ew_recycle_purge_token';

create table correction_internal.recycle_nonces (
  id uuid primary key,
  created_at timestamptz not null default statement_timestamp()
);
revoke all on correction_internal.recycle_nonces from public, anon, authenticated;

create function correction_internal.claim_recycle_jobs(p_nonce uuid, p_timestamp bigint, p_signature text)
returns table(id uuid, kind text, bucket text, target text)
language plpgsql security definer set search_path = '' as $$
declare
  v_now bigint := extract(epoch from statement_timestamp())::bigint;
begin
  if p_nonce is null or p_timestamp is null or p_timestamp not between v_now - 90 and v_now + 15
    or not exists (
      select 1 from vault.decrypted_secrets s where s.name = 'ew_recycle_purge_token'
        and p_signature = encode(extensions.hmac(p_nonce::text || ':' || p_timestamp::text,s.decrypted_secret,'sha256'),'hex')
    ) then raise exception 'Access denied' using errcode = '42501'; end if;

  delete from correction_internal.recycle_nonces where created_at < now() - interval '5 minutes';
  insert into correction_internal.recycle_nonces(id) values(p_nonce) on conflict do nothing;
  if not found then raise exception 'Access denied' using errcode = '42501'; end if;

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

create function public.recycle_purge_signed(p_nonce uuid, p_timestamp bigint, p_signature text)
returns table(id uuid, kind text, bucket text, target text)
language sql security invoker set search_path = '' as $$
  select * from correction_internal.claim_recycle_jobs(p_nonce,p_timestamp,p_signature);
$$;

revoke all on function correction_internal.claim_recycle_jobs(uuid,bigint,text),
  public.recycle_purge_signed(uuid,bigint,text) from public, anon, authenticated;
grant execute on function correction_internal.claim_recycle_jobs(uuid,bigint,text),
  public.recycle_purge_signed(uuid,bigint,text) to service_role;

select cron.alter_job(jobid,active:=true,command:=$job$
  with tick as (select gen_random_uuid()::text nonce, extract(epoch from statement_timestamp())::bigint stamp)
  select net.http_post(
    url := 'https://uzrzjqwawynbievgxcdu.supabase.co/functions/v1/recycle-purge',
    headers := jsonb_build_object('Content-Type','application/json','x-recycle-nonce',tick.nonce,
      'x-recycle-timestamp',tick.stamp::text,'x-recycle-signature',
      encode(extensions.hmac(tick.nonce || ':' || tick.stamp::text,s.decrypted_secret,'sha256'),'hex')),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  )
  from vault.decrypted_secrets s cross join tick where s.name = 'ew_recycle_purge_token'
$job$) from cron.job where jobname='elecworkshop-recycle-purge';
