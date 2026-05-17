"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type {
  MapZone,
  MapCheckin,
  MapSafePoint,
  MapLayer,
  MapFocus,
} from "./risk-map";

// Encuadra el mapa una sola vez, cuando llegan los primeros puntos.
function FitBounds({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
    done.current = true;
  }, [map, pts]);
  return null;
}

// Vuela el mapa hacia un conjunto de puntos cuando el copiloto lo pide.
function FocusOn({
  focus,
  zones,
  checkins,
  safePoints,
}: {
  focus: MapFocus | null;
  zones: MapZone[];
  checkins: MapCheckin[];
  safePoints: MapSafePoint[];
}) {
  const map = useMap();
  const dataRef = useRef({ zones, checkins, safePoints });
  dataRef.current = { zones, checkins, safePoints };
  useEffect(() => {
    if (!focus) return;
    const d = dataRef.current;
    let pts: [number, number][] = [];
    if (focus.value === "ayuda") {
      pts = d.checkins
        .filter((c) => c.status === "help")
        .map((c) => [c.lat, c.lon] as [number, number]);
    } else if (focus.value === "ciudadanos") {
      pts = d.checkins.map((c) => [c.lat, c.lon] as [number, number]);
    } else if (focus.value === "zonas") {
      pts = d.zones.map((z) => [z.lat, z.lon] as [number, number]);
    } else if (focus.value === "refugios") {
      pts = d.safePoints.map((s) => [s.lat, s.lon] as [number, number]);
    } else {
      pts = [
        ...d.zones.map((z) => [z.lat, z.lon] as [number, number]),
        ...d.checkins.map((c) => [c.lat, c.lon] as [number, number]),
        ...d.safePoints.map((s) => [s.lat, s.lon] as [number, number]),
      ];
    }
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo(pts[0], 16, { duration: 1.1 });
    } else {
      map.flyToBounds(L.latLngBounds(pts), {
        padding: [70, 70],
        maxZoom: 16,
        duration: 1.1,
      });
    }
  }, [map, focus]);
  return null;
}

// Marcador de zona: color y tamaño según los pedidos de ayuda reales.
function zoneIcon(z: MapZone): L.DivIcon {
  const h = z.helpCount;
  const color = h >= 3 ? "#ff4d4d" : h >= 1 ? "#ff8a3d" : "#4fc3f7";
  const size = h >= 3 ? 44 : h >= 1 ? 34 : 28;
  const font = h >= 3 ? 16 : h >= 1 ? 14 : 13;
  const crit = h >= 3 ? " crit" : "";
  const html =
    `<div class="zone-marker${crit}" style="width:${size}px;height:${size}px;` +
    `background:${color}33;border-color:${color};color:${color};` +
    `font-size:${font}px;">${h}</div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function checkinIcon(status: string): L.DivIcon {
  const color = status === "help" ? "#ff4d4d" : "#34d399";
  return L.divIcon({
    html:
      `<div class="case-dot" style="background:${color};` +
      `box-shadow:0 0 10px ${color};"></div>`,
    className: "",
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
  });
}

function safePointIcon(): L.DivIcon {
  return L.divIcon({
    html:
      `<div style="width:18px;height:18px;border-radius:5px;` +
      `background:#6e8bff;border:2px solid #0b1119;` +
      `box-shadow:0 0 8px rgba(110,139,255,0.7);"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function RiskMapInner({
  center,
  zones,
  checkins,
  safePoints,
  layer,
  focus,
}: {
  center: [number, number];
  zones: MapZone[];
  checkins: MapCheckin[];
  safePoints: MapSafePoint[];
  layer: MapLayer;
  focus: MapFocus | null;
}) {
  const allPts: [number, number][] = [
    ...zones.map((z) => [z.lat, z.lon] as [number, number]),
    ...checkins.map((c) => [c.lat, c.lon] as [number, number]),
    ...safePoints.map((s) => [s.lat, s.lon] as [number, number]),
  ];

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      <ZoomControl position="bottomright" />
      <FitBounds pts={allPts} />
      <FocusOn
        focus={focus}
        zones={zones}
        checkins={checkins}
        safePoints={safePoints}
      />

      {layer === "zonas" &&
        zones.map((z, i) => (
          <Marker key={`z${i}`} position={[z.lat, z.lon]} icon={zoneIcon(z)}>
            <Tooltip>
              {`${z.name} — ${z.helpCount} pide(n) ayuda · ${z.safeCount} a salvo`}
            </Tooltip>
          </Marker>
        ))}

      {layer === "ciudadanos" &&
        checkins.map((c, i) => (
          <Marker
            key={`c${i}`}
            position={[c.lat, c.lon]}
            icon={checkinIcon(c.status)}
          >
            <Tooltip>
              {c.status === "help"
                ? "Vecino: necesita ayuda"
                : "Vecino: a salvo"}
            </Tooltip>
          </Marker>
        ))}

      {layer === "refugios" &&
        safePoints.map((s, i) => (
          <Marker key={`s${i}`} position={[s.lat, s.lon]} icon={safePointIcon()}>
            <Tooltip>{`Punto seguro · ${s.name}`}</Tooltip>
          </Marker>
        ))}
    </MapContainer>
  );
}
