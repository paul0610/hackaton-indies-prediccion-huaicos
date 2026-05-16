import { query } from "@/lib/db";

export interface BasinConfig {
  id: number;
  slug: string;
  name: string;
  baseThreshold3hMm: number;
  baseThreshold6hMm: number;
  responseTimeMinDefault: number;
  /** Coordenadas del nodo de cabecera (cuenca alta) — punto de consulta de lluvia. */
  headwaterLat: number | null;
  headwaterLon: number | null;
}

interface BasinRow {
  id: string;
  slug: string;
  name: string;
  base_threshold_3h_mm: string;
  base_threshold_6h_mm: string;
  response_time_min_default: number;
  headwater_lat: string | null;
  headwater_lon: string | null;
}

/** Cuencas activas, con la coordenada de su nodo de cabecera (headwater). */
export async function getActiveBasins(): Promise<BasinConfig[]> {
  const rows = await query<BasinRow>(
    `select b.id, b.slug, b.name,
            b.base_threshold_3h_mm, b.base_threshold_6h_mm,
            b.response_time_min_default,
            n.lat as headwater_lat, n.lon as headwater_lon
       from basins b
       left join lateral (
         select lat, lon
           from nodes
          where nodes.basin_id = b.id
            and nodes.kind = 'headwater'
            and nodes.active
          order by nodes.elevation_m desc nulls last
          limit 1
       ) n on true
      where b.active
      order by b.id`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    baseThreshold3hMm: Number(r.base_threshold_3h_mm),
    baseThreshold6hMm: Number(r.base_threshold_6h_mm),
    responseTimeMinDefault: r.response_time_min_default,
    headwaterLat: r.headwater_lat === null ? null : Number(r.headwater_lat),
    headwaterLon: r.headwater_lon === null ? null : Number(r.headwater_lon),
  }));
}
