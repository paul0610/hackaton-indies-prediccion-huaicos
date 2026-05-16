-- ============================================================
-- Esquema Postgres - Sistema de Alerta Temprana de Huaicos
-- hack@latam 2026 - track Environment & Climate Risk
--
-- Implementa el modelo de datos del blueprint (capas A-H).
-- Diseno generalizable: toda la operacion cuelga de `basins`.
--
-- Aplicar:  psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

-- ============================================================
-- CONFIGURACION POR CUENCA (generalizacion del prototipo)
-- ============================================================

-- Una fila por cuenca/quebrada monitoreada.
create table basins (
  id                        bigint generated always as identity primary key,
  slug                      text        not null unique,          -- p.ej. 'quirio'
  name                      text        not null,
  country                   text        not null default 'PE',
  region                    text,
  active                    boolean     not null default true,
  base_threshold_3h_mm      numeric(6,2) not null,                 -- umbral base lluvia 3h
  base_threshold_6h_mm      numeric(6,2) not null,                 -- umbral base lluvia 6h
  response_time_min_default integer     not null default 45,       -- ETA por defecto (min)
  safe_point_name           text,
  safe_point_lat            numeric(9,6),
  safe_point_lon            numeric(9,6),
  config_json               jsonb       not null default '{}'::jsonb,
  created_at                timestamptz not null default now()
);

-- Puntos hidrologicos/operativos de la cuenca.
create table nodes (
  id          bigint generated always as identity primary key,
  basin_id    bigint not null references basins(id) on delete cascade,
  code        text   not null,
  name        text   not null,
  kind        text   not null check (kind in ('headwater','junction','zone_entry','outlet')),
  lat         numeric(9,6),
  lon         numeric(9,6),
  elevation_m numeric(7,1),
  active      boolean not null default true,
  unique (basin_id, code)
);

-- Topologia aguas abajo, con tiempo de viaje (ETA) por tramo.
create table edges (
  id             bigint generated always as identity primary key,
  basin_id       bigint not null references basins(id) on delete cascade,
  from_node_id   bigint not null references nodes(id) on delete cascade,
  to_node_id     bigint not null references nodes(id) on delete cascade,
  travel_minutes integer not null check (travel_minutes >= 0),
  distance_m     numeric(9,1),
  active         boolean not null default true,
  check (from_node_id <> to_node_id)
);

-- Zonas pobladas afectables.
create table zones (
  id              bigint generated always as identity primary key,
  basin_id        bigint not null references basins(id) on delete cascade,
  code            text   not null,
  name            text   not null,
  priority        integer not null default 100,
  entry_node_id   bigint references nodes(id) on delete set null,
  safe_point_name text,
  safe_point_lat  numeric(9,6),
  safe_point_lon  numeric(9,6),
  active          boolean not null default true,
  unique (basin_id, code)
);

-- Usuarios suscritos a una zona (residentes, coordinadores, brigadistas).
create table zone_subscriptions (
  id               bigint generated always as identity primary key,
  zone_id          bigint not null references zones(id) on delete cascade,
  telegram_chat_id text   not null,
  telegram_user_id text,
  display_name     text,
  language         text   not null default 'es' check (language in ('es','qu')),
  role             text   not null default 'resident'
                     check (role in ('resident','coordinator','brigadista')),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (zone_id, telegram_chat_id)
);

-- ============================================================
-- CAPA A/C - SENALES DE ENTRADA Y FEATURES
-- ============================================================

-- Observaciones de lluvia (GPM IMERG) y acumulados derivados.
create table rain_observations (
  id           bigint generated always as identity primary key,
  basin_id     bigint not null references basins(id) on delete cascade,
  observed_at  timestamptz not null,
  product      text   not null default 'imerg_early',
  rain_30m_mm  numeric(7,2),
  rain_3h_mm   numeric(7,2),
  rain_6h_mm   numeric(7,2),
  rain_24h_mm  numeric(7,2),
  rain_72h_mm  numeric(7,2),
  rain_7d_mm   numeric(7,2),
  source_url   text,
  raw_blob_url text,
  created_at   timestamptz not null default now(),
  unique (basin_id, observed_at, product)
);

-- Senales oficiales estructuradas por el agente LLM de ingesta (capa B).
create table official_signals (
  id             bigint generated always as identity primary key,
  basin_id       bigint references basins(id) on delete cascade,
  source         text not null,                  -- 'senamhi' | 'news' | 'institutional'
  title          text,
  raw_text       text,
  severity       text check (severity in ('watch','prealert','evacuate')),
  effective_from timestamptz,
  effective_to   timestamptz,
  source_url     text,
  llm_confidence numeric(4,3),
  created_at     timestamptz not null default now()
);

-- Reportes ciudadanos recibidos por Telegram (texto/foto/voz/ubicacion).
create table citizen_reports (
  id                bigint generated always as identity primary key,
  basin_id          bigint references basins(id) on delete set null,
  zone_id           bigint references zones(id)  on delete set null,
  telegram_chat_id  text,
  report_type       text check (report_type in
                       ('water_rise','mud','blocked_road','help','other')),
  raw_text          text,
  media_url         text,
  voice_transcript  text,
  lat               numeric(9,6),
  lon               numeric(9,6),
  received_at       timestamptz not null default now(),
  triage_confidence numeric(4,3),
  status            text not null default 'pending'
                      check (status in ('pending','validated','resolved','discarded')),
  created_at        timestamptz not null default now()
);

-- ============================================================
-- CAPA D - SUSCEPTIBILIDAD DE TERRENO (salida del modelo ML)
-- ============================================================

create table susceptibility_scores (
  id                   bigint generated always as identity primary key,
  basin_id             bigint not null references basins(id) on delete cascade,
  computed_at          timestamptz not null default now(),
  model_version        text   not null,
  susceptibility_score numeric(4,3) not null check (susceptibility_score between 0 and 1),
  susceptibility_band  text check (susceptibility_band in ('LOW','MEDIUM','HIGH')),
  feature_vector_json  jsonb
);

-- ============================================================
-- CAPA E/F - DECISION, INCIDENTES Y ALERTAS
-- ============================================================

-- Evaluacion periodica del motor de decision determinista.
create table risk_snapshots (
  id                        bigint generated always as identity primary key,
  basin_id                  bigint not null references basins(id) on delete cascade,
  computed_at               timestamptz not null default now(),
  rain_triggered            boolean not null default false,
  official_triggered        boolean not null default false,
  citizen_triggered         boolean not null default false,
  effective_threshold_3h_mm numeric(6,2),
  risk_level                text not null
                              check (risk_level in ('clear','watch','prealert','evacuate')),
  reason_code               text,
  explanation_json          jsonb
);

-- Incidente abierto cuando el riesgo deja de ser 'clear'.
create table incidents (
  id                 bigint generated always as identity primary key,
  basin_id           bigint not null references basins(id) on delete cascade,
  opened_at          timestamptz not null default now(),
  closed_at          timestamptz,
  current_level      text not null check (current_level in ('watch','prealert','evacuate')),
  origin_snapshot_id bigint references risk_snapshots(id) on delete set null,
  status             text not null default 'open' check (status in ('open','closed'))
);

-- Alerta generada (texto + audio TTS opcional) por zona.
create table alerts (
  id                bigint generated always as identity primary key,
  incident_id       bigint not null references incidents(id) on delete cascade,
  zone_id           bigint references zones(id) on delete set null,
  level             text not null check (level in ('watch','prealert','evacuate')),
  message_text      text not null,
  message_audio_url text,
  language          text not null default 'es',
  sent_at           timestamptz
);

-- Entrega individual de una alerta y acuse del vecino.
create table alert_deliveries (
  id                  bigint generated always as identity primary key,
  alert_id            bigint not null references alerts(id) on delete cascade,
  telegram_chat_id    text   not null,
  delivery_status     text   not null default 'pending'
                        check (delivery_status in ('pending','sent','failed')),
  telegram_message_id text,
  ack_kind            text check (ack_kind in ('safe','need_help','road_blocked')),
  ack_at              timestamptz,
  created_at          timestamptz not null default now()
);

-- Memoria operativa ligera del coordinador.
create table coordinator_notes (
  id          bigint generated always as identity primary key,
  incident_id bigint not null references incidents(id) on delete cascade,
  author_role text,
  note        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDICES (soportan las queries del blueprint)
-- ============================================================

create index idx_rain_obs_basin_time   on rain_observations    (basin_id, observed_at desc);
create index idx_risk_snap_basin_time  on risk_snapshots       (basin_id, computed_at desc);
create index idx_susc_basin_time       on susceptibility_scores(basin_id, computed_at desc);
create index idx_official_basin_time   on official_signals     (basin_id, created_at desc);
create index idx_citizen_status        on citizen_reports      (status, received_at);
create index idx_citizen_type_status   on citizen_reports      (report_type, status);
create index idx_incidents_basin_status on incidents           (basin_id, status);
create index idx_edges_from            on edges                (from_node_id) where active;
create index idx_zone_subs_zone        on zone_subscriptions   (zone_id) where active;
create index idx_alert_deliveries_alert on alert_deliveries    (alert_id);
