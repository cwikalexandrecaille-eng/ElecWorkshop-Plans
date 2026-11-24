create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule('elecworkshop-recycle-purge','*/15 * * * *',$job$
  select net.http_post(
    url := 'https://uzrzjqwawynbievgxcdu.supabase.co/functions/v1/recycle-purge',
    headers := jsonb_build_object('Content-Type','application/json','x-recycle-token',s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  )
  from vault.decrypted_secrets s where s.name = 'ew_recycle_purge_token'
$job$);
