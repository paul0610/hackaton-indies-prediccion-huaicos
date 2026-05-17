"use client";

import { useState } from "react";
import {
  RiskMap,
  type MapZone,
  type MapCheckin,
  type MapSafePoint,
  type MapFocus,
} from "./risk-map";
import { Copilot } from "./copilot";

// Puente entre el copiloto y el mapa: cuando el copiloto pide enfocar algo,
// se actualiza el foco (objeto nuevo por petición) y el mapa reacciona —
// cambia de capa y vuela hacia los puntos.
export function PanelStage({
  center,
  zones,
  checkins,
  safePoints,
  children,
}: {
  center: [number, number];
  zones: MapZone[];
  checkins: MapCheckin[];
  safePoints: MapSafePoint[];
  children: React.ReactNode;
}) {
  const [focus, setFocus] = useState<MapFocus | null>(null);

  return (
    <section className="row-2">
      <RiskMap
        center={center}
        zones={zones}
        checkins={checkins}
        safePoints={safePoints}
        focus={focus}
      />
      <div className="right-col">
        <Copilot onMapFocus={(value) => setFocus({ value })} />
        {children}
      </div>
    </section>
  );
}
