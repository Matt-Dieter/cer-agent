-- Dépôts supprimés par l'étudiant : la synchronisation ne les recrée plus
create table public.depots_ignores (
  etudiant_id uuid not null references public.etudiants(id) on delete cascade,
  cmid        int not null,
  supprime_le timestamptz not null default now(),
  primary key (etudiant_id, cmid)
);
alter table public.depots_ignores enable row level security;
create policy "mes dépôts supprimés" on public.depots_ignores for select to authenticated using (etudiant_id = (select auth.uid()));
create policy "réactiver un dépôt" on public.depots_ignores for delete to authenticated using (etudiant_id = (select auth.uid()));
