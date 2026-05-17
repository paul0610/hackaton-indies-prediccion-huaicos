-- Soft-supersede de observaciones de lluvia para la demo.
-- El replay deja observaciones con timestamp futuro; esta columna permite
-- "retirarlas" (active=false) al volver a datos reales, sin borrar nada.
--
-- Aplicar: node --env-file=.env.local scripts/db-migrate.mjs db/migration_rain_active.sql

alter table rain_observations
  add column if not exists active boolean not null default true;
