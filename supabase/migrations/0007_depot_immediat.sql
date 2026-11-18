-- Dépôt d'abord, relecture ensuite : un CER prêt (même « à relire ») part tout de suite sur Moodle.
alter table public.prosit_membres add column fichier_maj_le timestamptz;

create or replace function prive.declencher_depot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.statut in ('pret', 'a_relire') and new.statut is distinct from old.statut then
    perform net.http_post(
      url := 'https://wrzeqqlyeqmvmwxddkew.supabase.co/functions/v1/deposer',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
      body := jsonb_build_object('prosit', new.id), timeout_milliseconds := 120000);
  end if;
  return new;
end $$;
revoke all on function prive.declencher_depot() from public, anon, authenticated;
create trigger depot_des_que_pret after update of statut on public.prosits
  for each row execute function prive.declencher_depot();
