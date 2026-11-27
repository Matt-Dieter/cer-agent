-- 1 crédit de test pour les nouveaux comptes
alter table public.etudiants alter column credits set default 1;

-- Réveil automatique : un étudiant qui obtient un crédit (ou rejoint un prosit) sans avoir son CER le reçoit sans cliquer,
-- tant que l'échéance n'est pas dépassée de plus de 14 jours
create or replace function prive.reveiller_prosits(p_etudiant uuid) returns void
language sql security definer set search_path = '' as $$
  update public.prosits set statut = 'en_attente', a_relire = '[]'::jsonb
  where statut in ('pret', 'a_relire', 'depose') and echeance > now() - interval '14 days'
    and id in (select m.prosit_id from public.prosit_membres m where m.etudiant_id = p_etudiant and prive.a_rediger(m) and not m.refaire);
$$;
create or replace function prive.reveil_credit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.credits > old.credits then perform prive.reveiller_prosits(new.id); end if;
  return new;
end $$;
create trigger reveil_credit after update of credits on public.etudiants for each row execute function prive.reveil_credit();
create or replace function prive.reveil_membre() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.invitation = 'accepte' then perform prive.reveiller_prosits(new.etudiant_id); end if;
  return new;
end $$;
create trigger reveil_membre after insert or update of invitation on public.prosit_membres for each row execute function prive.reveil_membre();

-- Mesure du coût de rédaction (remplie par la session de rédaction, lue par l'administrateur via le tableau de bord)
create table public.couts_redaction (
  id bigint generated always as identity primary key,
  prosit_id uuid references public.prosits(id) on delete set null,
  membres integer not null,
  jetons_entree bigint not null, jetons_cache_ecrit bigint not null, jetons_cache_lu bigint not null, jetons_sortie bigint not null,
  recherches_web integer not null default 0,
  cout_usd_sonnet numeric(8,3) not null,
  cree_le timestamptz not null default now()
);
alter table public.couts_redaction enable row level security;
