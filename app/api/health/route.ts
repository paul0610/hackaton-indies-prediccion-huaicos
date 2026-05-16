import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// No prerenderizar: consulta la BD en cada request.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query<{ now: string; basins: string }>(
      "select now()::text as now, (select count(*) from basins)::text as basins",
    );
    return NextResponse.json({
      ok: true,
      db: "up",
      time: rows[0]?.now ?? null,
      basins: rows[0]?.basins ?? "0",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "down", error: (err as Error).message },
      { status: 500 },
    );
  }
}
