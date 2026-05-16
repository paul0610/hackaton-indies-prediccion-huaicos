import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { getActiveBasins } from "@/lib/basins";
import { runRiskEvaluation } from "@/lib/risk-pipeline";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Escenario de huaico guionizado para el demo: 4 pasos que escalan
// clear -> clear -> PREALERTA -> EVACUACIÓN. Reproducible (no borra datos).
interface ReplayStep {
  label: string;
  rain3h: number;
  rain6h: number;
  rain24h: number;
  rain72h: number;
  rain7d: number;
  hasOfficialSignal: boolean;
}

const SCENARIO: ReplayStep[] = [
  {
    label: "Calma — sin lluvia significativa",
    rain3h: 2, rain6h: 3, rain24h: 6, rain72h: 12, rain7d: 20,
    hasOfficialSignal: false,
  },
  {
    label: "Lluvia en la cuenca alta",
    rain3h: 9, rain6h: 14, rain24h: 28, rain72h: 40, rain7d: 55,
    hasOfficialSignal: false,
  },
  {
    label: "Lluvia intensa — cruza el umbral",
    rain3h: 17, rain6h: 24, rain24h: 45, rain72h: 60, rain7d: 75,
    hasOfficialSignal: false,
  },
  {
    label: "Aviso SENAMHI + lluvia sostenida",
    rain3h: 24, rain6h: 33, rain24h: 58, rain72h: 73, rain7d: 90,
    hasOfficialSignal: true,
  },
];

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const basins = await getActiveBasins();
    const basin = basins[0];
    if (!basin) {
      return NextResponse.json(
        { ok: false, error: "no hay cuencas activas" },
        { status: 400 },
      );
    }

    const baseMs = Date.now();
    const timeline: unknown[] = [];

    for (let i = 0; i < SCENARIO.length; i++) {
      const step = SCENARIO[i];
      // observed_at creciente y posterior a cualquier dato real,
      // para que cada paso sea el más reciente.
      const observedAt = new Date(baseMs + (i + 1) * 60_000).toISOString();

      await query(
        `insert into rain_observations
           (basin_id, observed_at, product,
            rain_3h_mm, rain_6h_mm, rain_24h_mm, rain_72h_mm, rain_7d_mm, source_url)
         values ($1, $2, 'replay', $3, $4, $5, $6, $7, 'demo://replay')
         on conflict (basin_id, observed_at, product) do update set
           rain_3h_mm = excluded.rain_3h_mm,
           rain_6h_mm = excluded.rain_6h_mm,
           rain_24h_mm = excluded.rain_24h_mm,
           rain_72h_mm = excluded.rain_72h_mm,
           rain_7d_mm = excluded.rain_7d_mm`,
        [
          basin.id, observedAt,
          step.rain3h, step.rain6h, step.rain24h, step.rain72h, step.rain7d,
        ],
      );

      const evaluation = await runRiskEvaluation(basin, {
        hasOfficialSignal: step.hasOfficialSignal,
        hasCitizenSignal: false,
      });

      timeline.push({
        step: i + 1,
        label: step.label,
        rain3hMm: step.rain3h,
        hasOfficialSignal: step.hasOfficialSignal,
        level: evaluation?.level ?? "clear",
        escalated: evaluation?.escalated ?? false,
        alerts: evaluation?.alerts ?? null,
      });
    }

    return NextResponse.json({ ok: true, basin: basin.slug, timeline });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
