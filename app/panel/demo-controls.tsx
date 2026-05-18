"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Controles SOLO para la demostración: disparan el escenario de evacuación
// o devuelven el sistema a calma. No forman parte del flujo operativo real.
export function DemoControls() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function run(action: "evacuacion" | "calma") {
    if (loading) return;
    setLoading(action);
    try {
      await fetch("/api/demo/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      // Silencioso: el panel se refresca igual y el usuario puede reintentar.
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  return (
    <span
      className="demo-group"
      data-tour="demo"
      title="Botones solo para la demostración: simulan un evento para probar el flujo completo. El sistema ya está preparado para detectar alertas reales — ingiere lluvia de Open-Meteo y evalúa el riesgo en vivo cada pocos minutos."
    >
      <span className="demo-tag">DEMO</span>
      <button
        className="demo-btn"
        onClick={() => run("evacuacion")}
        disabled={loading !== null}
      >
        {loading === "evacuacion" ? "Simulando…" : "Simular evacuación"}
      </button>
      <button
        className="demo-btn"
        onClick={() => run("calma")}
        disabled={loading !== null}
      >
        {loading === "calma" ? "Reseteando…" : "Volver a calma"}
      </button>
    </span>
  );
}
