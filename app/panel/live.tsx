"use client";

import { useEffect, useState } from "react";

/** Reloj en vivo (hora de Perú) para la barra superior. */
export function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => {
      setT(
        new Date().toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="chip mono">{t || "--:--:--"} PET</span>;
}

/** Contador "hace X" desde un timestamp ISO; se actualiza solo. */
export function Elapsed({ since }: { since: string }) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - new Date(since).getTime();
      if (!Number.isFinite(ms) || ms < 30_000) {
        setLabel("hace un momento");
        return;
      }
      const min = Math.floor(ms / 60_000);
      if (min < 60) {
        setLabel(`hace ${min} min`);
      } else {
        setLabel(`hace ${Math.floor(min / 60)} h ${min % 60} min`);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [since]);
  return <span>{label}</span>;
}
