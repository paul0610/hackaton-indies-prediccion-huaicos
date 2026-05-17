"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

export interface MapZone {
  name: string;
  lat: number;
  lon: number;
  helpCount: number;
  safeCount: number;
}
export interface MapCheckin {
  lat: number;
  lon: number;
  status: string;
}
export interface MapSafePoint {
  lat: number;
  lon: number;
  name: string;
}
export type MapLayer = "zonas" | "ciudadanos" | "refugios";

/** Petición del copiloto para enfocar el mapa. Objeto nuevo por petición. */
export interface MapFocus {
  value: string;
}

const RiskMapInner = dynamic(() => import("./risk-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-3)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
      }}
    >
      Cargando mapa…
    </div>
  ),
});

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "zonas", label: "Zonas" },
  { id: "ciudadanos", label: "Ciudadanos" },
  { id: "refugios", label: "Refugios" },
];

function layerForFocus(value: string): MapLayer {
  if (value === "ayuda" || value === "ciudadanos") return "ciudadanos";
  if (value === "refugios") return "refugios";
  return "zonas";
}

export function RiskMap({
  center,
  zones,
  checkins,
  safePoints,
  focus,
}: {
  center: [number, number];
  zones: MapZone[];
  checkins: MapCheckin[];
  safePoints: MapSafePoint[];
  focus: MapFocus | null;
}) {
  const [layer, setLayer] = useState<MapLayer>("zonas");

  // El copiloto puede pedir enfocar el mapa: ajustamos la capa al foco.
  useEffect(() => {
    if (focus) setLayer(layerForFocus(focus.value));
  }, [focus]);

  return (
    <div className="map-wrap">
      <RiskMapInner
        center={center}
        zones={zones}
        checkins={checkins}
        safePoints={safePoints}
        layer={layer}
        focus={focus}
      />

      <div className="map-top">
        <div style={{ display: "flex", gap: 6 }}>
          {LAYERS.map((l) => (
            <button
              key={l.id}
              className={`layer-btn${layer === l.id ? " active" : ""}`}
              onClick={() => setLayer(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="chip cyan">
          <span className="tp-dot cyan" style={{ width: 8, height: 8 }} />
          Tiempo real
        </span>
      </div>

      <div className="map-legend">
        {layer === "zonas" && (
          <>
            <span className="legend-item">
              <span className="sw" style={{ background: "#4fc3f7" }} />
              Sin pedidos
            </span>
            <span className="legend-item">
              <span className="sw" style={{ background: "#ff8a3d" }} />
              1–2 pedidos
            </span>
            <span className="legend-item">
              <span className="sw" style={{ background: "#ff4d4d" }} />
              3+ pedidos
            </span>
          </>
        )}
        {layer === "ciudadanos" && (
          <>
            <span className="legend-item">
              <span className="sw" style={{ background: "#ff4d4d" }} />
              Necesita ayuda
            </span>
            <span className="legend-item">
              <span className="sw" style={{ background: "#34d399" }} />
              A salvo
            </span>
          </>
        )}
        {layer === "refugios" && (
          <span className="legend-item">
            <span
              className="sw"
              style={{ background: "#6e8bff", borderRadius: 3 }}
            />
            Punto seguro / refugio
          </span>
        )}
      </div>
    </div>
  );
}
