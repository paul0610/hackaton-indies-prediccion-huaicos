import type { HourlyPrecip } from "@/lib/openmeteo";

export interface RainAccumulations {
  /** Instante de referencia, ISO8601 UTC con Z (vacío si no hay dato). */
  asOf: string;
  rain3hMm: number;
  rain6hMm: number;
  rain24hMm: number;
  rain72hMm: number;
  rain7dMm: number;
  /** Índice de humedad antecedente (proxy de saturación del suelo). */
  antecedentWetnessIndex: number;
}

/** Parsea un timestamp de Open-Meteo (UTC, "YYYY-MM-DDTHH:MM") a milisegundos. */
function toUtcMs(t: string): number {
  return Date.parse(t.length === 16 ? `${t}:00Z` : `${t}Z`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Índice de humedad antecedente — fórmula operativa del blueprint. */
export function antecedentWetnessIndex(
  rain24hMm: number,
  rain72hMm: number,
  rain7dMm: number,
): number {
  return round2(0.5 * rain24hMm + 0.3 * rain72hMm + 0.2 * (rain7dMm / 7));
}

/** Acumulados de lluvia sumando hacia atrás desde un índice de la serie. */
export function accumulateAt(series: HourlyPrecip, index: number): RainAccumulations {
  const p = series.precipitationMm;
  const sumBack = (hours: number): number => {
    let s = 0;
    for (let i = Math.max(0, index - hours + 1); i <= index && i < p.length; i++) {
      s += p[i] ?? 0;
    }
    return round2(s);
  };
  const rain24h = sumBack(24);
  const rain72h = sumBack(72);
  const rain7d = sumBack(168);
  const t = series.time[index] ?? "";
  const ms = t ? toUtcMs(t) : NaN;
  return {
    asOf: Number.isNaN(ms) ? "" : new Date(ms).toISOString(),
    rain3hMm: sumBack(3),
    rain6hMm: sumBack(6),
    rain24hMm: rain24h,
    rain72hMm: rain72h,
    rain7dMm: rain7d,
    antecedentWetnessIndex: antecedentWetnessIndex(rain24h, rain72h, rain7d),
  };
}

/** Índice del último registro cuyo timestamp es <= `now`. */
export function currentIndex(series: HourlyPrecip, now: Date = new Date()): number {
  const nowMs = now.getTime();
  let idx = 0;
  for (let i = 0; i < series.time.length; i++) {
    if (toUtcMs(series.time[i]) <= nowMs) idx = i;
    else break;
  }
  return idx;
}

/** Acumulados de lluvia al instante actual. */
export function accumulateNow(
  series: HourlyPrecip,
  now: Date = new Date(),
): RainAccumulations {
  return accumulateAt(series, currentIndex(series, now));
}
