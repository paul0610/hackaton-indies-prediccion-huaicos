// ============================================================
// Capa E - Motor de decisión determinista
//
// El cerebro AUDITABLE del sistema. La regla decide; el modelo
// ML solo modula el umbral (no dispara alertas por sí solo).
// Sin IA generativa en este archivo: solo cálculo y reglas.
// ============================================================

export type RiskLevel = "clear" | "watch" | "prealert" | "evacuate";

export interface RiskEngineInput {
  /** Lluvia acumulada en las últimas 3 h (mm). */
  rain3hMm: number;
  /** Lluvia acumulada en las últimas 6 h (mm). */
  rain6hMm: number;
  /** Índice de humedad antecedente (proxy de saturación del suelo). */
  antecedentWetnessIndex: number;
  /** Umbral base de lluvia 3 h de la cuenca (mm). */
  baseThreshold3hMm: number;
  /** Susceptibilidad del terreno (0..1) — salida del modelo ML. */
  susceptibilityScore: number;
  /** Hay un aviso oficial (SENAMHI) vigente. */
  hasOfficialSignal: boolean;
  /** Hay un reporte ciudadano corroborante. */
  hasCitizenSignal: boolean;
  /** Los feeds de datos públicos están operativos. */
  feedsHealthy: boolean;
}

export interface RiskEngineResult {
  level: RiskLevel;
  reasonCode: string;
  effectiveThreshold3hMm: number;
  /** Factor 0..1 con el que la humedad antecedente bajó el umbral. */
  wetnessFactor: number;
  rainTriggered: boolean;
  officialTriggered: boolean;
  citizenTriggered: boolean;
  explanation: string;
}

/** Peso con el que la susceptibilidad ML modula el umbral de lluvia. */
export const SUSCEPTIBILITY_WEIGHT = 0.25;

/** Peso con el que la humedad antecedente del suelo modula el umbral. */
export const WETNESS_WEIGHT = 0.15;

/** Índice de humedad antecedente (mm) tomado como "suelo saturado". */
export const WETNESS_SATURATION_MM = 50;

/**
 * Evalúa el nivel de riesgo de una cuenca.
 *
 * Filosofía: el ML contextualiza (ajusta el umbral por susceptibilidad),
 * la regla decide, y el resultado es siempre explicable.
 */
export function evaluateRisk(input: RiskEngineInput): RiskEngineResult {
  // El ML y la humedad antecedente modulan el umbral: terreno más
  // susceptible o suelo ya saturado por lluvia previa => umbral más bajo.
  const wetnessFactor = clamp01(
    input.antecedentWetnessIndex / WETNESS_SATURATION_MM,
  );
  const effectiveThreshold3hMm = round2(
    input.baseThreshold3hMm *
      (1 -
        SUSCEPTIBILITY_WEIGHT * clamp01(input.susceptibilityScore) -
        WETNESS_WEIGHT * wetnessFactor),
  );

  const rainTriggered = input.rain3hMm >= effectiveThreshold3hMm;
  const officialTriggered = input.hasOfficialSignal;
  const citizenTriggered = input.hasCitizenSignal;

  const flags = {
    effectiveThreshold3hMm,
    wetnessFactor: round2(wetnessFactor),
    rainTriggered,
    officialTriggered,
    citizenTriggered,
  };

  // Nota para la explicación cuando la humedad previa influyó de forma material.
  const wetnessNote =
    wetnessFactor >= 0.2
      ? " El suelo ya venía húmedo por lluvia previa, lo que redujo el umbral."
      : "";

  // EVACUACIÓN: predicción por lluvia + corroboración (oficial o ciudadana).
  if (rainTriggered && (officialTriggered || citizenTriggered)) {
    return {
      ...flags,
      level: "evacuate",
      reasonCode: officialTriggered ? "rain_plus_official" : "rain_plus_citizen",
      explanation:
        `La lluvia 3h (${input.rain3hMm} mm) cruzó el umbral efectivo ` +
        `(${effectiveThreshold3hMm} mm) y fue corroborada por ` +
        `${officialTriggered ? "un aviso oficial" : "un reporte ciudadano"}.` +
        wetnessNote,
    };
  }

  // PREALERTA: la lluvia cruza umbral, o hay aviso oficial sin corroborar aún.
  if (rainTriggered || officialTriggered) {
    return {
      ...flags,
      level: "prealert",
      reasonCode: rainTriggered
        ? "rain_threshold_crossed"
        : "official_notice_only",
      explanation: rainTriggered
        ? `La lluvia 3h (${input.rain3hMm} mm) cruzó el umbral efectivo ` +
          `(${effectiveThreshold3hMm} mm). Aún sin corroboración independiente.` +
          wetnessNote
        : "Hay un aviso oficial vigente; aún sin señal de lluvia que lo confirme.",
    };
  }

  // WATCH degradado: solo hay reporte ciudadano y los feeds públicos cayeron.
  if (citizenTriggered && !input.feedsHealthy) {
    return {
      ...flags,
      level: "watch",
      reasonCode: "citizen_only_degraded_mode",
      explanation:
        "Reporte ciudadano sin datos públicos para corroborar (feeds caídos). " +
        "Vigilancia en modo degradado.",
    };
  }

  // CLEAR: sin disparadores.
  return {
    ...flags,
    level: "clear",
    reasonCode: "no_trigger",
    explanation: "Sin disparadores activos.",
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
