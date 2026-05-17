-- Recalibración del umbral de lluvia 3h de la cuenca Quirio: 15 -> 12 mm.
--
-- Evidencia: backtest contra el huaico real de marzo 2017 (El Niño Costero),
-- cuyo pico de lluvia 3h fue 11.6 mm. Con base 12 mm el umbral efectivo
-- (modulado por la susceptibilidad del terreno) baja a ~9.7 mm, y el sistema
-- sí detecta el evento con margen.
--
-- Aplicar: node --env-file=.env.local scripts/db-migrate.mjs db/migration_recalibrate.sql

update basins set base_threshold_3h_mm = 12.00 where slug = 'quirio';
