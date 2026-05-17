import { query } from "@/lib/db";

export interface CoordinatorView {
  basin: { name: string; slug: string } | null;
  snapshot: {
    riskLevel: string;
    reasonCode: string;
    effectiveThreshold3hMm: number;
    explanation: string;
    computedAt: string;
    rainTriggered: boolean;
    officialTriggered: boolean;
    citizenTriggered: boolean;
  } | null;
  rain: {
    rain3hMm: number;
    rain6hMm: number;
    rain24hMm: number;
    observedAt: string;
    product: string;
  } | null;
  /** Timestamp del último pull real de Open-Meteo (independiente del replay de demo). */
  lastRealPullAt: string | null;
  susceptibility: { score: number; band: string | null } | null;
  incident: { level: string; openedAt: string } | null;
  zones: {
    id: number;
    code: string;
    name: string;
    priority: number;
    population: number | null;
    safePoint: string | null;
    safePointLat: number | null;
    safePointLon: number | null;
    entryLat: number | null;
    entryLon: number | null;
    helpCount: number;
    safeCount: number;
  }[];
  recentAlerts: { level: string; zone: string | null; sentAt: string | null }[];
  checkins: {
    status: string;
    zoneId: number | null;
    lat: number | null;
    lon: number | null;
    createdAt: string;
  }[];
  helpCount: number;
}

const n = (v: string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

const numOrNull = (v: string | null): number | null =>
  v === null ? null : Number(v);

/**
 * Población estimada por zona del piloto (dato de planificación).
 * Aproximado para Chosica/Quirio; calibrar con censo INEI antes de uso operativo.
 */
const ZONE_POPULATION: Record<string, number> = {
  NP: 1200,
  LP: 950,
  LC: 1400,
};

const EMPTY: CoordinatorView = {
  basin: null,
  snapshot: null,
  rain: null,
  lastRealPullAt: null,
  susceptibility: null,
  incident: null,
  zones: [],
  recentAlerts: [],
  checkins: [],
  helpCount: 0,
};

/** Reúne todo lo que muestra el panel del coordinador (primera cuenca activa). */
export async function getCoordinatorView(): Promise<CoordinatorView> {
  const basinRows = await query<{ id: string; name: string; slug: string }>(
    `select id, name, slug from basins where active order by id limit 1`,
  );
  if (basinRows.length === 0) return EMPTY;
  const basinId = Number(basinRows[0].id);

  const snap = await query<{
    risk_level: string;
    reason_code: string | null;
    effective_threshold_3h_mm: string | null;
    explanation_json: { explanation?: string } | null;
    computed_at: string;
    rain_triggered: boolean;
    official_triggered: boolean;
    citizen_triggered: boolean;
  }>(
    `select risk_level, reason_code, effective_threshold_3h_mm,
            explanation_json, computed_at::text as computed_at,
            rain_triggered, official_triggered, citizen_triggered
       from risk_snapshots
      where basin_id = $1
      order by computed_at desc
      limit 1`,
    [basinId],
  );

  const rain = await query<{
    rain_3h_mm: string | null;
    rain_6h_mm: string | null;
    rain_24h_mm: string | null;
    product: string;
    observed_at: string;
  }>(
    `select rain_3h_mm, rain_6h_mm, rain_24h_mm, product,
            observed_at::text as observed_at
       from rain_observations
      where basin_id = $1
      order by observed_at desc
      limit 1`,
    [basinId],
  );

  // Último pull real de Open-Meteo: puede diferir de la observación más
  // reciente si un replay de demo escribió datos después.
  const lastReal = await query<{ observed_at: string }>(
    `select observed_at::text as observed_at
       from rain_observations
      where basin_id = $1 and product = 'open_meteo'
      order by observed_at desc
      limit 1`,
    [basinId],
  );

  const susc = await query<{
    susceptibility_score: string;
    susceptibility_band: string | null;
  }>(
    `select susceptibility_score, susceptibility_band
       from susceptibility_scores
      where basin_id = $1
      order by computed_at desc
      limit 1`,
    [basinId],
  );

  const incident = await query<{ current_level: string; opened_at: string }>(
    `select current_level, opened_at::text as opened_at
       from incidents
      where basin_id = $1 and status = 'open'
      order by opened_at desc
      limit 1`,
    [basinId],
  );

  const zones = await query<{
    id: string;
    code: string;
    name: string;
    priority: number;
    safe_point_name: string | null;
    safe_point_lat: string | null;
    safe_point_lon: string | null;
    entry_lat: string | null;
    entry_lon: string | null;
  }>(
    `select z.id, z.code, z.name, z.priority, z.safe_point_name,
            z.safe_point_lat::text as safe_point_lat,
            z.safe_point_lon::text as safe_point_lon,
            en.lat::text as entry_lat,
            en.lon::text as entry_lon
       from zones z
       left join nodes en on en.id = z.entry_node_id
      where z.basin_id = $1 and z.active
      order by z.priority asc`,
    [basinId],
  );

  const alerts = await query<{
    level: string;
    zone_name: string | null;
    sent_at: string | null;
  }>(
    `select a.level, z.name as zone_name, a.sent_at::text as sent_at
       from alerts a
       left join zones z on z.id = a.zone_id
      where a.incident_id in (select id from incidents where basin_id = $1)
      order by a.sent_at desc nulls last, a.id desc
      limit 6`,
    [basinId],
  );

  const checkins = await query<{
    status: string;
    zone_id: string | null;
    lat: string | null;
    lon: string | null;
    created_at: string;
  }>(
    `select distinct on (telegram_chat_id)
            status, zone_id, lat::text as lat, lon::text as lon,
            created_at::text as created_at
       from citizen_checkins
      where basin_id = $1 and active
      order by telegram_chat_id, created_at desc`,
    [basinId],
  );

  const checkinList = checkins.map((c) => ({
    status: c.status,
    zoneId: c.zone_id === null ? null : Number(c.zone_id),
    lat: numOrNull(c.lat),
    lon: numOrNull(c.lon),
    createdAt: c.created_at,
  }));

  return {
    basin: { name: basinRows[0].name, slug: basinRows[0].slug },
    snapshot:
      snap.length > 0
        ? {
            riskLevel: snap[0].risk_level,
            reasonCode: snap[0].reason_code ?? "",
            effectiveThreshold3hMm: n(snap[0].effective_threshold_3h_mm),
            explanation: snap[0].explanation_json?.explanation ?? "",
            computedAt: snap[0].computed_at,
            rainTriggered: snap[0].rain_triggered,
            officialTriggered: snap[0].official_triggered,
            citizenTriggered: snap[0].citizen_triggered,
          }
        : null,
    rain:
      rain.length > 0
        ? {
            rain3hMm: n(rain[0].rain_3h_mm),
            rain6hMm: n(rain[0].rain_6h_mm),
            rain24hMm: n(rain[0].rain_24h_mm),
            observedAt: rain[0].observed_at,
            product: rain[0].product,
          }
        : null,
    lastRealPullAt: lastReal.length > 0 ? lastReal[0].observed_at : null,
    susceptibility:
      susc.length > 0
        ? {
            score: Number(susc[0].susceptibility_score),
            band: susc[0].susceptibility_band,
          }
        : null,
    incident:
      incident.length > 0
        ? { level: incident[0].current_level, openedAt: incident[0].opened_at }
        : null,
    zones: zones.map((z) => {
      const zoneId = Number(z.id);
      const zc = checkinList.filter((c) => c.zoneId === zoneId);
      return {
        id: zoneId,
        code: z.code,
        name: z.name,
        priority: z.priority,
        population: ZONE_POPULATION[z.code] ?? null,
        safePoint: z.safe_point_name,
        safePointLat: numOrNull(z.safe_point_lat),
        safePointLon: numOrNull(z.safe_point_lon),
        entryLat: numOrNull(z.entry_lat),
        entryLon: numOrNull(z.entry_lon),
        helpCount: zc.filter((c) => c.status === "help").length,
        safeCount: zc.filter((c) => c.status === "safe").length,
      };
    }),
    recentAlerts: alerts.map((a) => ({
      level: a.level,
      zone: a.zone_name,
      sentAt: a.sent_at,
    })),
    checkins: checkinList,
    helpCount: checkinList.filter((c) => c.status === "help").length,
  };
}
