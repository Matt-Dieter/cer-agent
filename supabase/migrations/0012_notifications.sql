-- Notifications dans l'application : un CER déposé (ou un dépôt impossible) prévient l'étudiant concerné ET les administrateurs, en temps réel.
create table public.notifications (
  id          bigint generated always as identity primary key,
  etudiant_id uuid not null references public.etudiants(id) on delete cascade,
  type        text not null check (type in ('depose','redepose','echec')),
  titre       text not null,
  message     text not null default '',
  prosit_id   uuid references public.prosits(id) on delete cascade,
  lu          boolean not null default false,
  cree_le     timestamptz not null default now()
);
create index on public.notifications (etudiant_id, lu, cree_le desc);
alter table public.notifications enable row level security;

create policy "mes notifications" on public.notifications for select to authenticated using (etudiant_id = (select auth.uid()));
create policy "marquer comme lue" on public.notifications for update to authenticated
  using (etudiant_id = (select auth.uid())) with check (etudiant_id = (select auth.uid()));
create policy "supprimer les miennes" on public.notifications for delete to authenticated using (etudiant_id = (select auth.uid()));
create policy "compte actif" on public.notifications as restrictive for all to authenticated using (prive.actif()) with check (prive.actif());
revoke update on public.notifications from authenticated;
grant update (lu) on public.notifications to authenticated;

create or replace function prive.notifier_depot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_num int; v_notion text; v_nom text; v_echec boolean;
begin
  select numero, notion into v_num, v_notion from public.prosits where id = new.prosit_id;
  select trim(coalesce(prenoms,'') || ' ' || coalesce(nom,'')) into v_nom from public.etudiants where id = new.etudiant_id;
  if v_nom is null or v_nom = '' then v_nom := 'Un étudiant'; end if;
  if new.depose_le is not null and new.depose_le is distinct from old.depose_le then
    insert into public.notifications (etudiant_id, type, titre, message, prosit_id)
      values (new.etudiant_id, case when old.depose_le is null then 'depose' else 'redepose' end,
              case when old.depose_le is null then 'Ton CER est déposé' else 'Ton CER a été redéposé' end,
              'Prosit ' || v_num || ' · ' || v_notion || ' : déposé sur Moodle.', new.prosit_id);
    insert into public.notifications (etudiant_id, type, titre, message, prosit_id)
      select e.id, case when old.depose_le is null then 'depose' else 'redepose' end,
             case when old.depose_le is null then 'CER déposé' else 'CER redéposé' end,
             v_nom || ' · Prosit ' || v_num || ' (' || v_notion || ') est déposé sur Moodle.', new.prosit_id
      from public.etudiants e where e.role = 'admin' and e.actif and e.id <> new.etudiant_id;
    return new;
  end if;
  v_echec := new.depot_statut is not null and new.depot_statut is distinct from old.depot_statut
             and (new.depot_statut like 'Échec%' or new.depot_statut like 'jeton refusé%' or new.depot_statut like 'Devoir %'
                  or new.depot_statut like 'Moodle non relié%' or new.depot_statut like 'Fichier CER introuvable%');
  if v_echec then
    insert into public.notifications (etudiant_id, type, titre, message, prosit_id)
      values (new.etudiant_id, 'echec', 'Dépôt impossible', 'Prosit ' || v_num || ' : ' || new.depot_statut, new.prosit_id);
    insert into public.notifications (etudiant_id, type, titre, message, prosit_id)
      select e.id, 'echec', 'Dépôt impossible', v_nom || ' · Prosit ' || v_num || ' : ' || new.depot_statut, new.prosit_id
      from public.etudiants e where e.role = 'admin' and e.actif and e.id <> new.etudiant_id;
  end if;
  return new;
end $$;
revoke all on function prive.notifier_depot() from public, anon, authenticated;
create trigger notifier_depot after update of depose_le, depot_statut on public.prosit_membres
  for each row execute function prive.notifier_depot();

-- Temps réel : l'application reçoit les nouvelles notifications sans recharger la page
alter publication supabase_realtime add table public.notifications;
