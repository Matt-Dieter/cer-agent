-- Le créateur valide un CER « à relire » (→ dépôt programmé) ou relance un prosit en erreur
create or replace function public.valider_prosit(p_prosit uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_statut text;
begin
  select statut into v_statut from public.prosits where id = p_prosit and createur_id = auth.uid();
  if v_statut = 'a_relire' then
    update public.prosits set statut = 'pret' where id = p_prosit; return 'pret';
  elsif v_statut = 'erreur' then
    update public.prosits set statut = 'en_attente', a_relire = '[]'::jsonb where id = p_prosit; return 'en_attente';
  end if;
  raise exception 'Action impossible pour ce prosit';
end $$;
revoke all on function public.valider_prosit(uuid) from public, anon;
grant execute on function public.valider_prosit(uuid) to authenticated;
