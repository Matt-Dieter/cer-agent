-- Dépôt écarté pour un temps (détection prématurée) : la ligne expire et la synchronisation peut le reprendre ensuite
alter table public.depots_ignores add column if not exists expire_le timestamptz;
select cron.schedule('certain-ignores-expires', '17 * * * *', $$ delete from public.depots_ignores where expire_le is not null and expire_le < now() $$);
