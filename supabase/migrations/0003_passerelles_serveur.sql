-- Points d'entrée réservés au serveur (service_role) pour les fonctions du schéma prive
create or replace function public.serveur_enregistrer_jeton(p_etudiant uuid, p_user text, p_jeton text)
returns void language sql security definer set search_path = '' as $$
  select prive.enregistrer_jeton_moodle(p_etudiant, p_user, p_jeton);
$$;
create or replace function public.serveur_lire_jeton(p_etudiant uuid)
returns text language sql security definer set search_path = '' as $$
  select prive.lire_jeton_moodle(p_etudiant);
$$;
create or replace function public.serveur_noter_echec(p_etudiant uuid)
returns int language sql security definer set search_path = '' as $$
  update public.moodle_liens set echecs = echecs + 1 where etudiant_id = p_etudiant returning echecs;
$$;
revoke all on function public.serveur_enregistrer_jeton(uuid, text, text), public.serveur_lire_jeton(uuid),
  public.serveur_noter_echec(uuid) from public, anon, authenticated;
grant execute on function public.serveur_enregistrer_jeton(uuid, text, text), public.serveur_lire_jeton(uuid),
  public.serveur_noter_echec(uuid) to service_role;
