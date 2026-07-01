SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'whatsapp-bot-cron';
SELECT cron.schedule(
  'whatsapp-bot-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gjfdpphvhbnsxvmyqnpf.supabase.co/functions/v1/whatsapp-bot-cron',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);