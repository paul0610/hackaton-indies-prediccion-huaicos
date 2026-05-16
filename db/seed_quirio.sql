-- ============================================================
-- Seed: cuenca piloto Quebrada Quirio (Chosica, Lima)
--
-- AVISO: las coordenadas, elevaciones, tiempos de viaje y umbrales
-- son APROXIMADOS para que el sistema corra end-to-end en desarrollo.
-- Deben calibrarse con datos reales (INGEMMET, SENAMHI, trabajo de campo)
-- antes de cualquier uso operativo.
--
-- Aplicar despues de schema.sql:
--   psql "$DATABASE_URL" -f db/seed_quirio.sql
-- ============================================================

-- --- Cuenca ---
insert into basins (slug, name, country, region,
                    base_threshold_3h_mm, base_threshold_6h_mm,
                    response_time_min_default,
                    safe_point_name, safe_point_lat, safe_point_lon)
values ('quirio', 'Quebrada Quirio', 'PE', 'Lima / Chosica',
        15.00, 25.00, 45,
        'Parque Echenique', -11.938000, -76.696000)
on conflict (slug) do nothing;

-- --- Nodos: de la cuenca alta a la desembocadura ---
insert into nodes (basin_id, code, name, kind, lat, lon, elevation_m)
select b.id, v.code, v.name, v.kind, v.lat, v.lon, v.elev
from basins b
cross join (values
  ('QRO_HEAD', 'Cuenca alta Quirio',               'headwater',  -11.910000, -76.670000, 1600),
  ('QRO_JUNC', 'Union quebrada media',             'junction',   -11.925000, -76.682000, 1100),
  ('QRO_NP',   'Entrada Nicolas de Pierola',       'zone_entry', -11.933000, -76.690000,  950),
  ('QRO_LP',   'Entrada Libertadores/Precursores', 'zone_entry', -11.936000, -76.694000,  900),
  ('QRO_LC',   'Entrada Las Casuarinas',           'zone_entry', -11.940000, -76.698000,  870),
  ('QRO_OUT',  'Desembocadura (rio Rimac)',        'outlet',     -11.943000, -76.701000,  820)
) as v(code, name, kind, lat, lon, elev)
where b.slug = 'quirio'
on conflict (basin_id, code) do nothing;

-- --- Aristas: topologia aguas abajo con ETA por tramo (minutos) ---
insert into edges (basin_id, from_node_id, to_node_id, travel_minutes, distance_m)
select b.id, fn.id, tn.id, v.tmin, v.dist
from basins b
cross join (values
  ('QRO_HEAD', 'QRO_JUNC', 18, 2200),
  ('QRO_JUNC', 'QRO_NP',    8,  900),
  ('QRO_NP',   'QRO_LP',    6,  700),
  ('QRO_LP',   'QRO_LC',    5,  600),
  ('QRO_LC',   'QRO_OUT',   4,  500)
) as v(from_code, to_code, tmin, dist)
join nodes fn on fn.basin_id = b.id and fn.code = v.from_code
join nodes tn on tn.basin_id = b.id and tn.code = v.to_code
where b.slug = 'quirio';

-- --- Zonas pobladas ---
insert into zones (basin_id, code, name, priority, entry_node_id,
                   safe_point_name, safe_point_lat, safe_point_lon)
select b.id, v.code, v.name, v.prio, n.id, v.sp_name, v.sp_lat, v.sp_lon
from basins b
cross join (values
  ('NP', 'Nicolas de Pierola',         10, 'QRO_NP', 'Parque Echenique',           -11.938000, -76.696000),
  ('LP', 'Libertadores / Precursores', 20, 'QRO_LP', 'Losa deportiva Precursores', -11.937000, -76.695500),
  ('LC', 'Las Casuarinas',             30, 'QRO_LC', 'Plaza Las Casuarinas',       -11.940500, -76.698500)
) as v(code, name, prio, entry_code, sp_name, sp_lat, sp_lon)
join nodes n on n.basin_id = b.id and n.code = v.entry_code
where b.slug = 'quirio'
on conflict (basin_id, code) do nothing;

-- --- Susceptibilidad placeholder (hasta tener el modelo ML real) ---
insert into susceptibility_scores (basin_id, model_version, susceptibility_score, susceptibility_band,
                                   feature_vector_json)
select b.id, 'seed-v0', 0.780, 'HIGH',
       '{"note": "placeholder de seed; reemplazar con salida del modelo ML"}'::jsonb
from basins b
where b.slug = 'quirio';
