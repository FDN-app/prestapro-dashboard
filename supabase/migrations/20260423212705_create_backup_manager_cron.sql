-- backup-diario-prestapro
SELECT cron.schedule(
  'backup-diario-prestapro',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vfegpejicvcykajbfwdx.supabase.co/functions/v1/backup-manager?disparo=cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWdwZWppY3ZjeWthamJmd2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTQ2OTgsImV4cCI6MjA5MTA5MDY5OH0.Ouq8FYhprY3sAyU24UqalVV_53PoNfwxCo38O-1ZyQs"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

-- resumen-semanal-prestapro
SELECT cron.schedule(
  'resumen-semanal-prestapro',
  '0 12 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://vfegpejicvcykajbfwdx.supabase.co/functions/v1/backup-manager?mode=weekly_summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWdwZWppY3ZjeWthamJmd2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTQ2OTgsImV4cCI6MjA5MTA5MDY5OH0.Ouq8FYhprY3sAyU24UqalVV_53PoNfwxCo38O-1ZyQs"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
