-- Tout membre peut ajouter ou remplacer l'énoncé, le prosit aller et le prosit retour du groupe,
-- et déposer SES propres versions (dossier perso/<son id>) qui servent à son seul CER.
drop policy if exists "membres lisent" on storage.objects;
drop policy if exists "membres déposent les sources" on storage.objects;

create policy "membres lisent" on storage.objects for select to authenticated
  using (bucket_id = 'prosits' and prive.est_membre(((storage.foldername(name))[1])::uuid)
         and (coalesce((storage.foldername(name))[2], '') <> 'perso' or (storage.foldername(name))[3] = (select auth.uid())::text));

create policy "membres déposent les sources" on storage.objects for insert to authenticated
  with check (bucket_id = 'prosits' and prive.est_membre(((storage.foldername(name))[1])::uuid)
              and storage.filename(name) ~ '^(enonce|aller|retour)\.'
              and (array_length(storage.foldername(name), 1) = 1
                   or ((storage.foldername(name))[2] = 'perso' and array_length(storage.foldername(name), 1) = 3
                       and (storage.foldername(name))[3] = (select auth.uid())::text)));

create policy "membres remplacent les sources" on storage.objects for update to authenticated
  using (bucket_id = 'prosits' and prive.est_membre(((storage.foldername(name))[1])::uuid)
         and storage.filename(name) ~ '^(enonce|aller|retour)\.'
         and (array_length(storage.foldername(name), 1) = 1
              or ((storage.foldername(name))[2] = 'perso' and (storage.foldername(name))[3] = (select auth.uid())::text)))
  with check (bucket_id = 'prosits' and prive.est_membre(((storage.foldername(name))[1])::uuid)
              and storage.filename(name) ~ '^(enonce|aller|retour)\.'
              and (array_length(storage.foldername(name), 1) = 1
                   or ((storage.foldername(name))[2] = 'perso' and (storage.foldername(name))[3] = (select auth.uid())::text)));

-- Refaire la rédaction avec les nouveaux documents (tout membre ; prochain passage de la session de rédaction)
create or replace function public.relancer_redaction(p_prosit uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not prive.actif() then raise exception 'Accès retiré'; end if;
  if not exists (select 1 from public.prosit_membres where prosit_id = p_prosit and etudiant_id = auth.uid() and invitation = 'accepte') then
    raise exception 'Tu ne fais pas partie de ce prosit';
  end if;
  update public.prosits set statut = 'en_attente', a_relire = '[]'::jsonb
    where id = p_prosit and statut in ('a_relire', 'pret', 'depose', 'erreur');
end $$;
revoke all on function public.relancer_redaction(uuid) from public, anon;
grant execute on function public.relancer_redaction(uuid) to authenticated;
