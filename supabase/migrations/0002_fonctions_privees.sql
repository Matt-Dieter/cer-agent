-- Déplace les fonctions internes hors du schéma exposé par l'API (public → prive)
create schema if not exists prive;
revoke all on schema prive from public, anon;
grant usage on schema prive to authenticated, service_role;

alter function public.est_membre(uuid) set schema prive;
alter function public.est_createur(uuid) set schema prive;
alter function public.partage_un_prosit(uuid) set schema prive;
alter function public.creer_etudiant() set schema prive;
alter function public.ajouter_createur() set schema prive;
alter function public.enregistrer_jeton_moodle(uuid, text, text) set schema prive;
alter function public.lire_jeton_moodle(uuid) set schema prive;

revoke all on function prive.est_membre(uuid), prive.est_createur(uuid), prive.partage_un_prosit(uuid) from public, anon;
grant execute on function prive.est_membre(uuid), prive.est_createur(uuid), prive.partage_un_prosit(uuid) to authenticated;
revoke all on function prive.creer_etudiant(), prive.ajouter_createur() from public, anon, authenticated;
revoke all on function prive.enregistrer_jeton_moodle(uuid, text, text), prive.lire_jeton_moodle(uuid) from public, anon, authenticated;
grant execute on function prive.enregistrer_jeton_moodle(uuid, text, text), prive.lire_jeton_moodle(uuid) to service_role;
grant usage on schema prive to supabase_auth_admin;
grant execute on function prive.creer_etudiant() to supabase_auth_admin;
