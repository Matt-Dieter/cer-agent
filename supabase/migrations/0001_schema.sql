-- CERtain : schéma initial
-- Principe : un étudiant ne voit que lui-même et les prosits dont il est membre.
-- Les jetons Moodle sont chiffrés dans Vault et lisibles uniquement par le serveur (service_role).

-- ─── Étudiants ──────────────────────────────────────────────────────────────
create table public.etudiants (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  nom         text not null default '',
  prenoms     text not null default '',
  groupe      text not null default '',
  theme       jsonb not null default '{}'::jsonb,
  moodle_relie boolean not null default false,
  cree_le     timestamptz not null default now()
);

-- Inscription réservée aux adresses de l'école
create or replace function public.creer_etudiant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email !~* '@([a-z0-9-]+\.)*ucac-icam\.com$' then
    raise exception 'Inscription réservée aux adresses @ucac-icam.com';
  end if;
  insert into public.etudiants (id, email) values (new.id, lower(new.email));
  return new;
end $$;

create trigger a_l_inscription after insert on auth.users
  for each row execute function public.creer_etudiant();

-- ─── Lien Moodle (serveur uniquement) ───────────────────────────────────────
create table public.moodle_liens (
  etudiant_id uuid primary key references public.etudiants(id) on delete cascade,
  moodle_user text not null,
  secret_id   uuid not null,          -- id du secret dans vault.secrets
  relie_le    timestamptz not null default now(),
  echecs      int not null default 0  -- connexions refusées consécutives
);

create or replace function public.enregistrer_jeton_moodle(p_etudiant uuid, p_user text, p_jeton text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old uuid; v_new uuid;
begin
  select secret_id into v_old from public.moodle_liens where etudiant_id = p_etudiant;
  if v_old is not null then delete from vault.secrets where id = v_old; end if;
  v_new := vault.create_secret(p_jeton, 'moodle_' || p_etudiant::text);
  insert into public.moodle_liens (etudiant_id, moodle_user, secret_id)
    values (p_etudiant, p_user, v_new)
    on conflict (etudiant_id) do update set moodle_user = excluded.moodle_user,
      secret_id = excluded.secret_id, relie_le = now(), echecs = 0;
  update public.etudiants set moodle_relie = true where id = p_etudiant;
end $$;

create or replace function public.lire_jeton_moodle(p_etudiant uuid)
returns text language sql security definer set search_path = '' as $$
  select s.decrypted_secret from public.moodle_liens l
  join vault.decrypted_secrets s on s.id = l.secret_id
  where l.etudiant_id = p_etudiant;
$$;

-- L'étudiant peut se délier lui-même : supprime le jeton
create or replace function public.delier_moodle() returns void
language plpgsql security definer set search_path = '' as $$
declare v_old uuid;
begin
  select secret_id into v_old from public.moodle_liens where etudiant_id = auth.uid();
  if v_old is not null then delete from vault.secrets where id = v_old; end if;
  delete from public.moodle_liens where etudiant_id = auth.uid();
  update public.etudiants set moodle_relie = false where id = auth.uid();
end $$;

revoke all on function public.enregistrer_jeton_moodle(uuid, text, text) from public, anon, authenticated;
revoke all on function public.lire_jeton_moodle(uuid) from public, anon, authenticated;
grant execute on function public.enregistrer_jeton_moodle(uuid, text, text) to service_role;
grant execute on function public.lire_jeton_moodle(uuid) to service_role;
revoke all on function public.delier_moodle() from public, anon;
grant execute on function public.delier_moodle() to authenticated;

-- ─── Prosits et membres ─────────────────────────────────────────────────────
create table public.prosits (
  id          uuid primary key default gen_random_uuid(),
  createur_id uuid not null references public.etudiants(id) on delete cascade,
  numero      int not null check (numero between 1 and 99),
  notion      text not null,
  cours       text not null default '',
  cmid        int,
  groupe      text not null default '',
  annee       text not null default '',
  echeance    timestamptz,
  statut      text not null default 'brouillon' check (statut in
               ('brouillon','en_attente','en_redaction','pret','depose','a_relire','erreur')),
  a_relire    jsonb not null default '[]'::jsonb,
  cree_le     timestamptz not null default now()
);

create table public.prosit_membres (
  prosit_id    uuid not null references public.prosits(id) on delete cascade,
  etudiant_id  uuid not null references public.etudiants(id) on delete cascade,
  invitation   text not null default 'invite' check (invitation in ('invite','accepte','refuse')),
  annule       boolean not null default false,  -- « Annuler » le dépôt automatique
  fichier      text,                            -- chemin du .docx dans le stockage
  depot_statut text,
  depose_le    timestamptz,
  primary key (prosit_id, etudiant_id)
);

-- Ajout automatique du créateur comme membre accepté
create or replace function public.ajouter_createur() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.prosit_membres (prosit_id, etudiant_id, invitation)
    values (new.id, new.createur_id, 'accepte');
  return new;
end $$;
create trigger apres_creation_prosit after insert on public.prosits
  for each row execute function public.ajouter_createur();

-- Helpers RLS (security definer pour éviter la récursion des politiques)
create or replace function public.est_membre(p_prosit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.prosit_membres
                 where prosit_id = p_prosit and etudiant_id = auth.uid());
$$;
create or replace function public.est_createur(p_prosit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.prosits where id = p_prosit and createur_id = auth.uid());
$$;
create or replace function public.partage_un_prosit(p_autre uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.prosit_membres a join public.prosit_membres b
                 on a.prosit_id = b.prosit_id
                 where a.etudiant_id = auth.uid() and b.etudiant_id = p_autre);
$$;

-- Recherche d'un camarade par e-mail exact (pas d'annuaire complet)
create or replace function public.trouver_etudiant(p_email text)
returns table (id uuid, nom text, prenoms text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.nom, e.prenoms from public.etudiants e
  where e.email = lower(trim(p_email)) and auth.uid() is not null;
$$;
revoke all on function public.trouver_etudiant(text) from public, anon;
grant execute on function public.trouver_etudiant(text) to authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.etudiants      enable row level security;
alter table public.moodle_liens   enable row level security;  -- aucune politique : serveur seulement
alter table public.prosits        enable row level security;
alter table public.prosit_membres enable row level security;

create policy "moi ou mes coéquipiers" on public.etudiants for select to authenticated
  using (id = auth.uid() or public.partage_un_prosit(id));
create policy "modifier mon profil" on public.etudiants for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.etudiants from authenticated;
grant update (nom, prenoms, groupe, theme) on public.etudiants to authenticated;

create policy "voir mes prosits" on public.prosits for select to authenticated
  using (public.est_membre(id));
create policy "créer un prosit" on public.prosits for insert to authenticated
  with check (createur_id = auth.uid());
create policy "modifier mon prosit avant rédaction" on public.prosits for update to authenticated
  using (createur_id = auth.uid() and statut in ('brouillon','en_attente'))
  with check (createur_id = auth.uid() and statut in ('brouillon','en_attente'));
create policy "supprimer mon brouillon" on public.prosits for delete to authenticated
  using (createur_id = auth.uid() and statut = 'brouillon');
revoke update on public.prosits from authenticated;
grant update (numero, notion, cours, cmid, groupe, annee, echeance, statut) on public.prosits to authenticated;

create policy "voir les membres de mes prosits" on public.prosit_membres for select to authenticated
  using (public.est_membre(prosit_id));
create policy "le créateur invite" on public.prosit_membres for insert to authenticated
  with check (public.est_createur(prosit_id) and invitation = 'invite');
create policy "le créateur retire" on public.prosit_membres for delete to authenticated
  using (public.est_createur(prosit_id) and etudiant_id <> auth.uid());
create policy "je réponds / j'annule" on public.prosit_membres for update to authenticated
  using (etudiant_id = auth.uid()) with check (etudiant_id = auth.uid());
revoke update on public.prosit_membres from authenticated;
grant update (invitation, annule) on public.prosit_membres to authenticated;

-- ─── Stockage des documents ─────────────────────────────────────────────────
-- Chemin : <prosit_id>/<fichier>  (enonce, aller, retour, CER générés)
insert into storage.buckets (id, name, public, file_size_limit)
  values ('prosits', 'prosits', false, 20971520)
  on conflict (id) do nothing;

create policy "membres lisent" on storage.objects for select to authenticated
  using (bucket_id = 'prosits' and public.est_membre(((storage.foldername(name))[1])::uuid));
create policy "membres déposent les sources" on storage.objects for insert to authenticated
  with check (bucket_id = 'prosits' and public.est_membre(((storage.foldername(name))[1])::uuid)
              and (storage.filename(name)) ~ '^(enonce|aller|retour)\.');
