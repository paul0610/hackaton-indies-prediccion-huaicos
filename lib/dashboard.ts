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
  } | null;
  susceptibility: { score: number; band: string | null } | null;
  incident: { level: string; openedAt: string } | null;
  zones: { name: string; priority: number; safePoint: string | null }[];
  recentAlerts: { level: string; zone: string | null; sentAt: string | null }[];
}

const n = (v: string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);

/** Reúne todo lo que muestra el panel del coordinador (primera cuenca activa). */
export async function getCoordinatorView(): Promise<CoordinatorView> {
  const basinRows = await query<{ id: string; name: string; slug: string }>(
    `select id, name, slug from basins where active order by id limit 1`,
  );
  if (basinRows.length === 0) {
    return {
      basin: null, snapshot: null, rain: null,
      susceptibility: null, incident: null, zones: [], recentAlerts: [],
    };
  }
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
    observed_at: string;
  }>(
    `select rain_3h_mm, rain_6h_mm, rain_24h_mm, observed_at::text as observed_at
       from rain_observations
      where basin_id = $1
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
    name: string;
    priority: number;
    safe_point_name: string | null;
  }>(
    `select name, priority, safe_point_name
       from zones
      where basin_id = $1 and active
      order by priority asc`,
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
          }
        : null,
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
    zones: zones.map((z) => ({
      name: z.name,
      priority: z.priority,
      safePoint: z.safe_point_name,
    })),
    recentAlerts: alerts.map((a) => ({
      level: a.level,
      zone: a.zone_name,
      sentAt: a.sent_at,
    })),
  };
}
