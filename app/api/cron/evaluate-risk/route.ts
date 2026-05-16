import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { getActiveBasins } from "@/lib/basins";
import { runRiskEvaluation } from "@/lib/risk-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Capa E/F: evalúa el riesgo de todas las cuencas activas.
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const basins = await getActiveBasins();
    const evaluated: unknown[] = [];
    for (const basin of basins) {
      const evaluation = await runRiskEvaluation(basin);
      evaluated.push(
        evaluation ?? { basin: basin.slug, skipped: "sin datos de lluvia" },
      );
    }
    return NextResponse.json({ ok: true, evaluated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
