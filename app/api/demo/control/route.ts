import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Endpoint público de control de la demo: dispara el escenario de
// evacuación (replay) o devuelve el sistema a calma. Reusa los endpoints
// internos protegidos, pasándoles el CRON_SECRET del lado del servidor
// (el secreto nunca llega al cliente).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: unknown };
    const action = typeof body.action === "string" ? body.action : "";

    const host =
      req.headers.get("host") ??
      "hackaton-indies-prediccion-huaicos.vercel.app";
    const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
    const headers = { authorization: `Bearer ${env.cronSecret()}` };

    if (action === "evacuacion") {
      const res = await fetch(`${origin}/api/demo/replay`, { headers });
      return NextResponse.json({
        ok: res.ok,
        action,
        result: await res.json().catch(() => ({})),
      });
    }

    if (action === "calma") {
      const ingest = await fetch(`${origin}/api/cron/ingest-rain`, { headers });
      const evaluate = await fetch(`${origin}/api/cron/evaluate-risk`, {
        headers,
      });
      // Soft-reset de los check-ins de la demo: se ocultan (active=false),
      // no se borran — el dato se conserva y la operación es reversible.
      await query(
        `update citizen_checkins set active = false where active = true`,
      );
      return NextResponse.json({
        ok: ingest.ok && evaluate.ok,
        action,
        result: {
          ingest: await ingest.json().catch(() => ({})),
          evaluate: await evaluate.json().catch(() => ({})),
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Acción no reconocida; usa 'evacuacion' o 'calma'." },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
