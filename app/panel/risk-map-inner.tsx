"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";

export interface MapPoint {
  lat: number;
  lon: number;
  kind: "help" | "safe" | "safe-point";
  label: string;
}

const COLOR: Record<MapPoint["kind"], string> = {
  help: "#dc2626",
  safe: "#16a34a",
  "safe-point": "#2563eb",
};

// Encuadra el mapa para que se vean todos los puntos.
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lon] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function RiskMapInner({
  center,
  points,
}: {
  center: [number, number];
  points: MapPoint[];
}) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: 380, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution="&copy; Esri World Imagery"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <FitBounds points={points} />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lon]}
          radius={p.kind === "safe-point" ? 7 : 10}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: COLOR[p.kind],
            fillOpacity: 0.9,
          }}
        >
          <Tooltip>{p.label}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
