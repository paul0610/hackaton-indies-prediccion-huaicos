"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./risk-map-inner";

export type { MapPoint };

// Leaflet necesita `window`: se carga solo en el cliente (ssr: false).
const RiskMapInner = dynamic(() => import("./risk-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 380,
        borderRadius: 12,
        background: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b7280",
      }}
    >
      Cargando mapa...
    </div>
  ),
});

export function RiskMap(props: {
  center: [number, number];
  points: MapPoint[];
}) {
  return <RiskMapInner {...props} />;
}
