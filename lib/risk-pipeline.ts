import { query } from "@/lib/db";
import { evaluateRisk, type RiskLevel } from "@/lib/risk-engine";
import { antecedentWetnessIndex } from "@/lib/rainfall";
import { dispatchAlerts } from "@/lib/alerts";
import type { BasinConfig } from "@/lib/basins";

const RANK: Record<RiskLevel, number> = {
  clear: 0,
  watch: 1,
  prealert: 2,
  evacuate: 3,
};

interface RainRow {
  rain_3h_mm: string | null;
  rain_6h_mm: string | null;
  rain_24h_mm: string | null;
  rain_72h_mm: string | null;
  rain_7d_mm: string | null;
}

const num = (v: string | null): number => (v === null ? 0 : Number(v));

export interface RiskEvaluation {
  basinSlug: string;
  level: RiskLevel;
  previousLevel: RiskLevel;
  reasonCode: string;
  effectiveThreshold3hMm: number;
  explanation: string;
  escalated: boolean;
  alerts: { zones: number; sent: number; failed: number } | null;
}

/**
 * Capa E/F para una cuenca: lee la última lluvia y las señales de
 * corroboración, corre el motor, registra el snapshot, gestiona el
 * incidente y despacha alertas si el riesgo escaló.
 *
 * `opts` permite forzar las señales de corroboración (lo usa el replay);
 * si no se pasan, se consultan en la base de datos.
 */
export async function runRiskEvaluation(
  basin: BasinConfig,
  opts: { hasOfficialSignal?: boolean; hasCitizenSignal?: boolean } = {},
): Promise<RiskEvaluation | null> {
  const rain = await query<RainRow>(
    `select rain_3h_mm, rain_6h_mm, rain_24h_mm, rain_72h_mm, rain_7d_mm
       from rain_observations
      where basin_id = $1 and active
      order by observed_at desc
      limit 1`,
    [basin.id],
  );
  if (rain.length === 0) return null;

  const susc = await query<{ susceptibility_score: string }>(
    `select susceptibility_score from susceptibility_scores
      where basin_id = $1 order by computed_at desc limit 1`,
    [basin.id],
  );

  // Capa 2 — corroboración: aviso oficial o reporte ciudadano reciente.
  let hasOfficialSignal: boolean;
  if (opts.hasOfficialSignal !== undefined) {
    hasOfficialSignal = opts.hasOfficialSignal;
  } else {
    const official = await query<{ n: string }>(
      `select count(*) as n from official_signals
        where basin_id = $1 and created_at > now() - interval '6 hours'`,
      [basin.id],
    );
    hasOfficialSignal = Number(official[0]?.n ?? 0) > 0;
  }

  let hasCitizenSignal: boolean;
  if (opts.hasCitizenSignal !== undefined) {
    hasCitizenSignal = opts.hasCitizenSignal;
  } else {
    const citizen = await query<{ n: string }>(
      `select count(*) as n from citizen_reports
        where basin_id = $1 and status <> 'discarded'
          and received_at > now() - interval '6 hours'`,
      [basin.id],
    );
    hasCitizenSignal = Number(citizen[0]?.n ?? 0) > 0;
  }

  const rain24h = num(rain[0].rain_24h_mm);
  const rain72h = num(rain[0].rain_72h_mm);
  const rain7d = num(rain[0].rain_7d_mm);
  const awi = antecedentWetnessIndex(rain24h, rain72h, rain7d);

  const result = evaluateRisk({
    rain3hMm: num(rain[0].rain_3h_mm),
    rain6hMm: num(rain[0].rain_6h_mm),
    antecedentWetnessIndex: awi,
    baseThreshold3hMm: basin.baseThreshold3hMm,
    susceptibilityScore: susc.length ? Number(susc[0].susceptibility_score) : 0,
    hasOfficialSignal,
    hasCitizenSignal,
    feedsHealthy: true,
  });

  const snap = await query<{ id: string }>(
    `insert into risk_snapshots
       (basin_id, rain_triggered, official_triggered, citizen_triggered,
        effective_threshold_3h_mm, risk_level, reason_code, explanation_json)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      basin.id,
      result.rainTriggered,
      result.officialTriggered,
      result.citizenTriggered,
      result.effectiveThreshold3hMm,
      result.level,
      result.reasonCode,
      JSON.stringify({
        explanation: result.explanation,
        antecedentWetnessIndex: awi,
        wetnessFactor: result.wetnessFactor,
      }),
    ],
  );
  const snapshotId = Number(snap[0].id);

  // Incidente: abrir / actualizar / cerrar.
  const open = await query<{ id: string; current_level: string }>(
    `select id, current_level from incidents
      where basin_id = $1 and status = 'open' limit 1`,
    [basin.id],
  );
  const previousLevel = (
    open.length > 0 ? open[0].current_level : "clear"
  ) as RiskLevel;
  let incidentId: number | null = null;

  if (result.level === "clear") {
    if (open.length > 0) {
      await query(
        `update incidents set status = 'closed', closed_at = now() where id = $1`,
        [Number(open[0].id)],
      );
    }
  } else if (open.length === 0) {
    const inc = await query<{ id: string }>(
      `insert into incidents (basin_id, current_level, origin_snapshot_id, status)
       values ($1, $2, $3, 'open') returning id`,
      [basin.id, result.level, snapshotId],
    );
    incidentId = Number(inc[0].id);
  } else {
    incidentId = Number(open[0].id);
    if (open[0].current_level !== result.level) {
      await query(`update incidents set current_level = $1 where id = $2`, [
        result.level,
        incidentId,
      ]);
    }
  }

  // Despachar alertas solo si el riesgo escaló de nivel.
  const escalated =
    result.level !== "clear" && RANK[result.level] > RANK[previousLevel];
  let alerts: RiskEvaluation["alerts"] = null;
  if (escalated && incidentId !== null && result.level !== "clear") {
    alerts = await dispatchAlerts({
      basinId: basin.id,
      basinName: basin.name,
      incidentId,
      level: result.level,
      etaMin: basin.responseTimeMinDefault,
    });
  }

  return {
    basinSlug: basin.slug,
    level: result.level,
    previousLevel,
    reasonCode: result.reasonCode,
    effectiveThreshold3hMm: result.effectiveThreshold3hMm,
    explanation: result.explanation,
    escalated,
    alerts,
  };
}
