-- Détection souple : un CER dont le numéro de prosit n'est pas reconnu garde le numéro 0 (« sans numéro »)
alter table public.prosits drop constraint if exists prosits_numero_check;
alter table public.prosits add constraint prosits_numero_check check (numero between 0 and 99);
-- (la fonction prive.notifier_depot est aussi mise à jour pour afficher « Prosit » sans numéro quand il vaut 0)
