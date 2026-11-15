create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secret partagé entre pg_cron et la fonction « deposer » (généré ici, jamais affiché)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret')
where not exists (select 1 from vault.secrets where name = 'cron_secret');

create or replace function public.serveur_verifier_cron(p_secret text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.serveur_verifier_cron(text) from public, anon, authenticated;
grant execute on function public.serveur_verifier_cron(text) to service_role;

select cron.schedule('certain-depot-horaire', '7 * * * *', $$
  select net.http_post(
    url := 'https://wrzeqqlyeqmvmwxddkew.supabase.co/functions/v1/deposer',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$$);
