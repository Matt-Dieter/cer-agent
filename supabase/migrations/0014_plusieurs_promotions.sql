-- Plusieurs promotions : promotion déduite de l'e-mail, regroupement par (devoir, promotion, groupe), devoirs « Kin » par étudiant,
-- et synchronisation par lots pour tenir avec beaucoup d'étudiants.
alter table public.etudiants add column promotion text;
alter table public.etudiants add column devoirs_kin boolean not null default false;
alter table public.etudiants add column sync_le timestamptz;
alter table public.prosits add column promotion text;
grant update (devoirs_kin) on public.etudiants to authenticated;

update public.etudiants set promotion = (regexp_match(lower(email), '@(\d{4})\.'))[1] where promotion is null;
update public.prosits p set promotion = e.promotion from public.etudiants e where e.id = p.createur_id and p.promotion is null;

create or replace function prive.creer_etudiant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email !~* '@([a-z0-9-]+\.)*ucac-icam\.com$' then
    raise exception 'Inscription réservée aux adresses @ucac-icam.com';
  end if;
  if not exists (select 1 from public.acces where email = lower(new.email)) then
    raise exception 'Adresse non autorisée sur CERtain';
  end if;
  insert into public.etudiants (id, email, promotion)
    values (new.id, lower(new.email), (regexp_match(lower(new.email), '@(\d{4})\.'))[1]);
  return new;
end $$;

drop function if exists public.admin_lister_acces();
create or replace function public.admin_lister_acces()
returns table (email text, ajoute_le timestamptz, inscrit boolean, moodle_relie boolean, actif boolean, role text, nom text, promotion text)
language sql stable security definer set search_path = '' as $$
  select a.email, a.ajoute_le, e.id is not null, coalesce(e.moodle_relie, false), coalesce(e.actif, true), coalesce(e.role, 'etudiant'),
         trim(coalesce(e.prenoms, '') || ' ' || coalesce(e.nom, '')), (regexp_match(a.email, '@(\d{4})\.'))[1]
  from public.acces a left join public.etudiants e on e.email = a.email
  where prive.est_admin()
  order by a.ajoute_le desc;
$$;
revoke all on function public.admin_lister_acces() from public, anon;
grant execute on function public.admin_lister_acces() to authenticated;

select cron.unschedule('certain-synchro-horaire');
select cron.schedule('certain-synchro-lots', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://wrzeqqlyeqmvmwxddkew.supabase.co/functions/v1/synchroniser',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 300000);
$$);
