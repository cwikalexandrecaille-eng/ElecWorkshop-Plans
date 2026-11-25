select cron.schedule('elecworkshop-push','* * * * *',$job$
 with tick as (select gen_random_uuid()::text nonce,extract(epoch from statement_timestamp())::bigint stamp)
 select net.http_post(
  url:='https://uzrzjqwawynbievgxcdu.supabase.co/functions/v1/push-dispatch',
  headers:=jsonb_build_object('Content-Type','application/json','x-push-nonce',tick.nonce,
   'x-push-timestamp',tick.stamp::text,'x-push-signature',
   encode(extensions.hmac(tick.nonce||':'||tick.stamp::text,s.decrypted_secret,'sha256'),'hex')),
  body:='{}'::jsonb,timeout_milliseconds:=25000)
 from vault.decrypted_secrets s cross join tick where s.name='ew_push_signing'
$job$);
