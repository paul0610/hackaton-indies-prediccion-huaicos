-- Soft-reset de check-ins para la demo: marca active=false en vez de borrar.
-- Permite resetear el demo (botón "Volver a calma") sin destruir registros;
-- el dato se conserva y la operación es reversible.
--
-- Aplicar: node --env-file=.env.local scripts/db-migrate.mjs db/migration_checkin_active.sql

alter table citizen_checkins
  add column if not exists active boolean not null default true;
