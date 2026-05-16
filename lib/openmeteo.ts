// Cliente de Open-Meteo: precipitación reciente, pronóstico e histórico.
// API gratuita, sin API key. Docs: https://open-meteo.com/en/docs

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

export interface HourlyPrecip {
  /** Timestamps ISO8601 en UTC (formato "YYYY-MM-DDTHH:MM"). */
  time: string[];
  /** Precipitación en mm por hora, alineada con `time`. */
  precipitationMm: number[];
}

interface OpenMeteoResponse {
  hourly?: { time?: string[]; precipitation?: (number | null)[] };
}

function normalize(data: OpenMeteoResponse): HourlyPrecip {
  return {
    time: data.hourly?.time ?? [],
    precipitationMm: (data.hourly?.precipitation ?? []).map((v) => v ?? 0),
  };
}

/** Precipitación horaria reciente + pronóstico para unas coordenadas. */
export async function fetchHourlyPrecip(
  lat: number,
  lon: number,
  opts: { pastDays?: number; forecastDays?: number } = {},
): Promise<HourlyPrecip> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "precipitation",
    past_days: String(opts.pastDays ?? 7),
    forecast_days: String(opts.forecastDays ?? 2),
    timezone: "GMT",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast falló (HTTP ${res.status})`);
  }
  return normalize((await res.json()) as OpenMeteoResponse);
}

/** Precipitación horaria histórica (replay de eventos pasados). Fechas "YYYY-MM-DD". */
export async function fetchArchivePrecip(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<HourlyPrecip> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "precipitation",
    start_date: startDate,
    end_date: endDate,
    timezone: "GMT",
  });
  const res = await fetch(`${ARCHIVE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo archive falló (HTTP ${res.status})`);
  }
  return normalize((await res.json()) as OpenMeteoResponse);
}
