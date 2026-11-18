-- Tout membre du prosit peut lancer la rédaction tout de suite (brouillon → en attente), si l'énoncé est là
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
  update public.prosits set statut = 'en_attente' where id = p_prosit and statut = 'brouillon';
end $$;
revoke all on function public.lancer_redaction(uuid) from public, anon;
grant execute on function public.lancer_redaction(uuid) to authenticated;
