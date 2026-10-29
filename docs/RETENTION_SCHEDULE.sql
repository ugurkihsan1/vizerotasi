-- Dashboard SQL Editor only. Enable Cron (pg_cron/pg_net) and Vault first.
-- Replace the placeholder BELOW with the SAME private RETENTION_CRON_SECRET
-- saved in Edge Functions > Secrets. Never paste a service_role key here.
-- Idempotent: updates existing named Vault entries and replaces the named job.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $setup$
declare
 token_value text := 'BURAYA_EDGE_SECRET_ILE_AYNI_DEGER';
 url_value text := 'https://ebnkdgvngufxarkwiyxt.supabase.co/functions/v1/retention-cleanup';
 secret_id uuid;
 old_job record;
begin
 if token_value='BURAYA_EDGE_SECRET_ILE_AYNI_DEGER' or length(token_value)<32 then
  raise exception 'Replace the placeholder with your private RETENTION_CRON_SECRET (at least 32 characters).';
 end if;

 select id into secret_id from vault.secrets where name='vizesel_retention_url';
 if found then
  perform vault.update_secret(secret_id,url_value);
 else
  perform vault.create_secret(url_value,'vizesel_retention_url');
 end if;
 select id into secret_id from vault.secrets where name='vizesel_retention_token';
 if found then
  perform vault.update_secret(secret_id,token_value);
 else
  perform vault.create_secret(token_value,'vizesel_retention_token');
 end if;

 for old_job in select jobid from cron.job where jobname='vizesel-evidence-retention-hourly' loop
  perform cron.unschedule(old_job.jobid);
 end loop;
 perform cron.schedule(
  'vizesel-evidence-retention-hourly',
  '17 * * * *',
  $job$
  select net.http_post(
   url := (select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_url'),
   headers := jsonb_build_object(
    'Content-Type','application/json',
    'x-retention-token',(select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_token')
   ),
   body := '{}'::jsonb,
   timeout_milliseconds := 100000
  );
  $job$
 );
end $setup$;

-- First asynchronous run. This prints only its request ID, never the secret.
select net.http_post(
 url := (select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_url'),
 headers := jsonb_build_object(
  'Content-Type','application/json',
  'x-retention-token',(select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_token')
 ),
 body := '{}'::jsonb,
 timeout_milliseconds := 100000
);

-- Run these checks again after the asynchronous function call completes.
select * from public.retention_policy_status();
select jobname,schedule,active from cron.job where jobname='vizesel-evidence-retention-hourly';
commit;
