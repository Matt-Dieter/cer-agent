-- Crédits : 1 crédit = 1 CER livré à un étudiant. Plafond de départ offert, recharge par l'administrateur.
alter table public.etudiants add column credits integer not null default 3;
update public.etudiants set credits = 5 where role <> 'admin';
update public.etudiants set credits = 100 where role = 'admin';

create table public.credits_mouvements (
  id          bigint generated always as identity primary key,
  etudiant_id uuid not null references public.etudiants(id) on delete cascade,
  delta       integer not null,
  motif       text not null,
  prosit_id   uuid references public.prosits(id) on delete set null,
  cree_le     timestamptz not null default now()
);
alter table public.credits_mouvements enable row level security;
create policy "ses mouvements" on public.credits_mouvements for select to authenticated using (etudiant_id = auth.uid());
grant select on public.credits_mouvements to authenticated;

-- Un crédit est débité quand le CER d'un étudiant est livré pour la première fois (pas aux remplacements ni aux refontes)
create or replace function prive.debiter_credit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.fichier is null and new.fichier is not null then
    update public.etudiants set credits = credits - 1 where id = new.etudiant_id;
    insert into public.credits_mouvements (etudiant_id, delta, motif, prosit_id) values (new.etudiant_id, -1, 'CER livré', new.prosit_id);
  end if;
  return new;
end $$;
create trigger debiter_credit after update of fichier on public.prosit_membres
  for each row execute function prive.debiter_credit();

create or replace function public.admin_ajouter_credits(p_email text, p_nombre integer, p_motif text default 'Recharge')
returns integer language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_solde integer;
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur'; end if;
  select id into v_id from public.etudiants where email = lower(trim(p_email));
  if v_id is null then raise exception 'Étudiant inscrit introuvable'; end if;
  update public.etudiants set credits = credits + p_nombre where id = v_id returning credits into v_solde;
  insert into public.credits_mouvements (etudiant_id, delta, motif) values (v_id, p_nombre, coalesce(nullif(trim(p_motif), ''), 'Recharge'));
  return v_solde;
end $$;
revoke all on function public.admin_ajouter_credits(text, integer, text) from public, anon;
grant execute on function public.admin_ajouter_credits(text, integer, text) to authenticated;

drop function if exists public.admin_lister_acces();
create or replace function public.admin_lister_acces()
returns table (email text, ajoute_le timestamptz, inscrit boolean, moodle_relie boolean, actif boolean, role text, nom text, promotion text, credits integer)
language sql stable security definer set search_path = '' as $$
  select a.email, a.ajoute_le, e.id is not null, coalesce(e.moodle_relie, false), coalesce(e.actif, true), coalesce(e.role, 'etudiant'),
         trim(coalesce(e.prenoms, '') || ' ' || coalesce(e.nom, '')), (regexp_match(a.email, '@(\d{4})\.'))[1], e.credits
  from public.acces a left join public.etudiants e on e.email = a.email
  where prive.est_admin()
  order by a.ajoute_le desc;
$$;
revoke all on function public.admin_lister_acces() from public, anon;
grant execute on function public.admin_lister_acces() to authenticated;

-- Lancer la rédaction : au moins un membre doit avoir un crédit (ou déjà son CER)
create or replace function public.lancer_redaction(p_prosit uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not prive.actif() then raise exception 'Accès retiré'; end if;
  if not exists (select 1 from public.prosit_membres where prosit_id = p_prosit and etudiant_id = auth.uid() and invitation = 'accepte') then
    raise exception 'Tu ne fais pas partie de ce prosit';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'prosits' and name like p_prosit::text || '/enonce.%') then
    raise exception 'Énoncé manquant';
  end if;
  if not exists (select 1 from public.prosit_membres m join public.etudiants e on e.id = m.etudiant_id
                 where m.prosit_id = p_prosit and m.invitation = 'accepte' and not m.annule and (e.credits > 0 or m.fichier is not null)) then
    raise exception 'Crédits épuisés : recharge pour lancer la rédaction';
  end if;
  update public.prosits set statut = 'en_attente' where id = p_prosit and statut = 'brouillon';
end $$;
