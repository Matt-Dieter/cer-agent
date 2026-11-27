-- Devoirs réutilisés d'une année sur l'autre avec les dates de l'an dernier : l'échéance est estimée
alter table public.prosits drop constraint if exists prosits_source_check;
alter table public.prosits add constraint prosits_source_check check (source in ('manuel', 'moodle', 'moodle_date_estimee'));
