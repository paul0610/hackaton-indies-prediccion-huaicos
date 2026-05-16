-- Migración: check-ins ciudadanos (respuesta del vecino a una alerta).
-- Aplicar: node --env-file=.env.local scripts/db-migrate.mjs db/migration_citizen.sql

create table if not exists citizen_checkins (
  id               bigint generated always as identity primary key,
  basin_id         bigint references basins(id) on delete cascade,
  zone_id          bigint references zones(id) on delete set null,
  telegram_chat_id text   not null,
  status           text   not null check (status in ('safe','help')),
  lat              numeric(9,6),
  lon              numeric(9,6),
  created_at       timestamptz not null default now()
);

create index if not exists idx_checkins_chat_time
  on citizen_checkins (telegram_chat_id, created_at desc);
create index if not exists idx_checkins_basin_time
  on citizen_checkins (basin_id, created_at desc);
