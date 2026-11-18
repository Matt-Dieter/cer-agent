-- Un CER remplacé (corrigé par l'étudiant ou re-rédigé) repart tout de suite sur Moodle
create or replace function prive.declencher_redepot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.fichier_maj_le is distinct from old.fichier_maj_le and new.depose_le is not null then
    perform net.http_post(
      url := 'https://wrzeqqlyeqmvmwxddkew.supabase.co/functions/v1/deposer',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
      body := jsonb_build_object('prosit', new.prosit_id), timeout_milliseconds := 120000);
  end if;
  return new;
end $$;
revoke all on function prive.declencher_redepot() from public, anon, authenticated;
create trigger redepot_si_remplace after update of fichier_maj_le on public.prosit_membres
  for each row execute function prive.declencher_redepot();
