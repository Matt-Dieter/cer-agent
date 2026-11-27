-- Crédits indépendants : chaque étudiant lance et paie son propre CER, sans dépendre des autres membres du groupe.
alter table public.prosit_membres add column refaire boolean not null default false;

-- Un membre est « à rédiger » s'il n'a pas encore de CER et qu'il a un crédit, ou s'il demande une refonte
create or replace function prive.a_rediger(p_membre public.prosit_membres) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_membre.invitation = 'accepte' and not p_membre.annule
     and (p_membre.refaire or (p_membre.fichier is null and exists (select 1 from public.etudiants e where e.id = p_membre.etudiant_id and e.credits > 0)));
$$;

create or replace function prive.verifier_credits_lancement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.statut = 'en_attente' and old.statut = 'brouillon' and not exists (
    select 1 from public.prosit_membres m where m.prosit_id = new.id and prive.a_rediger(m)
  ) then
    new.statut := 'brouillon';
  end if;
  return new;
end $$;

-- « Obtenir / refaire mon CER » : agit sur le seul CER de l'appelant
create or replace function public.relancer_redaction(p_prosit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.prosit_membres; v_credits integer;
begin
  if not prive.actif() then raise exception 'Accès retiré'; end if;
  select * into m from public.prosit_membres where prosit_id = p_prosit and etudiant_id = auth.uid() and invitation = 'accepte' and not annule;
  if not found then raise exception 'Tu ne fais pas partie de ce prosit'; end if;
  if m.fichier is null then
    select credits into v_credits from public.etudiants where id = auth.uid();
    if v_credits <= 0 then raise exception 'Crédits épuisés : recharge pour obtenir ton CER'; end if;
  else
    update public.prosit_membres set refaire = true where prosit_id = p_prosit and etudiant_id = auth.uid();
  end if;
  update public.prosits set statut = 'en_attente', a_relire = '[]'::jsonb
    where id = p_prosit and statut in ('a_relire', 'pret', 'depose', 'erreur', 'brouillon');
end $$;

-- Lancement manuel d'un brouillon : le même contrôle, sur l'appelant
create or replace function public.lancer_redaction(p_prosit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_credits integer;
begin
  if not prive.actif() then raise exception 'Accès retiré'; end if;
  if not exists (select 1 from public.prosit_membres where prosit_id = p_prosit and etudiant_id = auth.uid() and invitation = 'accepte') then
    raise exception 'Tu ne fais pas partie de ce prosit';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'prosits' and name like p_prosit::text || '/enonce.%') then
    raise exception 'Énoncé manquant';
  end if;
  select credits into v_credits from public.etudiants where id = auth.uid();
  if v_credits <= 0 then raise exception 'Crédits épuisés : recharge pour lancer la rédaction'; end if;
  update public.prosits set statut = 'en_attente' where id = p_prosit and statut = 'brouillon';
end $$;

-- Tarif : 2 000 FCFA les 5 crédits pour les 5 premiers abonnés, 2 500 ensuite
create or replace function public.tarif_actuel() returns table (prix integer, credits integer, places_restantes integer)
language sql stable security definer set search_path = '' as $$
  with n as (select count(distinct etudiant_id)::int as c from public.credits_mouvements where delta > 0 and motif = 'Recharge')
  select case when n.c < 5 then 2000 else 2500 end, 5, greatest(5 - n.c, 0) from n where prive.actif();
$$;
revoke all on function public.tarif_actuel() from public, anon;
grant execute on function public.tarif_actuel() to authenticated;
