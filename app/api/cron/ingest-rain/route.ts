import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { getActiveBasins } from "@/lib/basins";
import { fetchHourlyPrecip } from "@/lib/openmeteo";
import { accumulateNow } from "@/lib/rainfall";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Capa A/C: ingiere precipitación de Open-Meteo y guarda los acumulados
// por cuenca en `rain_observations`.
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const basins = await getActiveBasins();
    const ingested: unknown[] = [];

    for (const basin of basins) {
      if (basin.headwaterLat === null || basin.headwaterLon === null) {
        ingested.push({ basin: basin.slug, skipped: "sin nodo headwater" });
        continue;
      }

      const series = await fetchHourlyPrecip(
        basin.headwaterLat,
        basin.headwaterLon,
        { pastDays: 7, forecastDays: 1 },
      );
      const acc = accumulateNow(series);
      if (!acc.asOf) {
        ingested.push({ basin: basin.slug, skipped: "Open-Meteo sin datos" });
        continue;
      }

      await query(
        `insert into rain_observations
           (basin_id, observed_at, product,
            rain_3h_mm, rain_6h_mm, rain_24h_mm, rain_72h_mm, rain_7d_mm, source_url)
         values ($1, $2, 'open_meteo', $3, $4, $5, $6, $7, 'https://open-meteo.com')
         on conflict (basin_id, observed_at, product) do update set
           rain_3h_mm = excluded.rain_3h_mm,
           rain_6h_mm = excluded.rain_6h_mm,
           rain_24h_mm = excluded.rain_24h_mm,
           rain_72h_mm = excluded.rain_72h_mm,
           rain_7d_mm = excluded.rain_7d_mm`,
        [
          basin.id,
          acc.asOf,
          acc.rain3hMm,
          acc.rain6hMm,
          acc.rain24hMm,
          acc.rain72hMm,
          acc.rain7dMm,
        ],
      );

      ingested.push({
        basin: basin.slug,
        observedAt: acc.asOf,
        rain3hMm: acc.rain3hMm,
        rain24hMm: acc.rain24hMm,
      });
    }

    return NextResponse.json({ ok: true, ingested });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
