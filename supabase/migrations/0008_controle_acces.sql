-- Accès sur liste : l'administrateur choisit qui peut utiliser CERtain.
create table public.acces (
  email      text primary key check (email = lower(email)),
  ajoute_par uuid references public.etudiants(id) on delete set null,
  ajoute_le  timestamptz not null default now()
);
alter table public.acces enable row level security;  -- lecture/écriture uniquement via les fonctions admin

alter table public.etudiants add column role text not null default 'etudiant' check (role in ('etudiant','admin'));
alter table public.etudiants add column actif boolean not null default true;

insert into public.acces (email) values ('edouard.massoma@2029.ucac-icam.com') on conflict do nothing;
update public.etudiants set role = 'admin' where email = 'edouard.massoma@2029.ucac-icam.com';

create or replace function prive.creer_etudiant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email !~* '@([a-z0-9-]+\.)*ucac-icam\.com$' then
    raise exception 'Inscription réservée aux adresses @ucac-icam.com';
  end if;
  if not exists (select 1 from public.acces where email = lower(new.email)) then
    raise exception 'Adresse non autorisée sur CERtain';
  end if;
  insert into public.etudiants (id, email) values (new.id, lower(new.email));
  return new;
end $$;

create or replace function prive.actif() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.etudiants where id = auth.uid() and actif);
$$;
create or replace function prive.est_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.etudiants where id = auth.uid() and actif and role = 'admin');
$$;
revoke all on function prive.actif(), prive.est_admin() from public, anon;
grant execute on function prive.actif(), prive.est_admin() to authenticated;

-- Un compte retiré ne voit plus rien et ne peut plus rien faire (politiques restrictives, combinées en ET)
create policy "compte actif" on public.prosits as restrictive for all to authenticated using (prive.actif()) with check (prive.actif());
create policy "compte actif" on public.prosit_membres as restrictive for all to authenticated using (prive.actif()) with check (prive.actif());
create policy "compte actif" on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'prosits' or prive.actif()) with check (bucket_id <> 'prosits' or prive.actif());

create or replace function public.admin_lister_acces()
returns table (email text, ajoute_le timestamptz, inscrit boolean, moodle_relie boolean, actif boolean, role text, nom text)
language sql stable security definer set search_path = '' as $$
  select a.email, a.ajoute_le, e.id is not null, coalesce(e.moodle_relie, false), coalesce(e.actif, true), coalesce(e.role, 'etudiant'),
         trim(coalesce(e.prenoms, '') || ' ' || coalesce(e.nom, ''))
  from public.acces a left join public.etudiants e on e.email = a.email
  where prive.est_admin()
  order by a.ajoute_le desc;
$$;

create or replace function public.admin_autoriser(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare v text := lower(trim(p_email));
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur'; end if;
  if v !~* '@([a-z0-9-]+\.)*ucac-icam\.com$' then raise exception 'Adresse @ucac-icam.com attendue'; end if;
  insert into public.acces (email, ajoute_par) values (v, auth.uid()) on conflict (email) do nothing;
  update public.etudiants set actif = true where email = v;
end $$;

create or replace function public.admin_retirer(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare v text := lower(trim(p_email));
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur'; end if;
  if exists (select 1 from public.etudiants where email = v and id = auth.uid()) then
    raise exception 'Tu ne peux pas te retirer toi-même';
  end if;
  delete from public.acces where email = v;
  update public.etudiants set actif = false, auto = false where email = v;
end $$;

revoke all on function public.admin_lister_acces(), public.admin_autoriser(text), public.admin_retirer(text) from public, anon;
grant execute on function public.admin_lister_acces(), public.admin_autoriser(text), public.admin_retirer(text) to authenticated;
