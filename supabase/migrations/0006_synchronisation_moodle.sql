-- Mode automatique (par défaut) : CERtain suit seul les CER à rendre détectés sur Moodle
alter table public.etudiants add column auto boolean not null default true;
grant update (auto) on public.etudiants to authenticated;

alter table public.prosits add column source text not null default 'manuel' check (source in ('manuel','moodle'));
alter table public.prosits add column course_id int;
create index on public.prosits (cmid);

-- Synchronisation chaque heure (minute 37), même secret que le dépôt
select cron.schedule('certain-synchro-horaire', '37 * * * *', $$
  select net.http_post(
    url := 'https://wrzeqqlyeqmvmwxddkew.supabase.co/functions/v1/synchroniser',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 300000);
$$);
