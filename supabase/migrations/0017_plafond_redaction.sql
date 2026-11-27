-- Le passage « brouillon → en attente » (lancement manuel ou automatique) exige qu'un membre ait un crédit ou son CER déjà livré
create or replace function prive.verifier_credits_lancement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.statut = 'en_attente' and old.statut = 'brouillon' and not exists (
    select 1 from public.prosit_membres m join public.etudiants e on e.id = m.etudiant_id
    where m.prosit_id = new.id and m.invitation = 'accepte' and not m.annule and (e.credits > 0 or m.fichier is not null)
  ) then
    new.statut := 'brouillon';
  end if;
  return new;
end $$;
create trigger verifier_credits_lancement before update of statut on public.prosits
  for each row execute function prive.verifier_credits_lancement();
