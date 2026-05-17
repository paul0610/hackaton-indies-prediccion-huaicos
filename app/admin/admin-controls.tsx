"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVALS = [
  { label: "30 min", min: 30 },
  { label: "1 hora", min: 60 },
  { label: "8 horas", min: 480 },
  { label: "1 día", min: 1440 },
];

// Controles del pipeline. El cron de Vercel (vercel.json) es el job agendado
// siempre activo. El programador de abajo dispara la ingesta al intervalo
// elegido mientras esta consola esté abierta.
export function AdminControls() {
  const router = useRouter();
  const [intervalMin, setIntervalMin] = useState(60);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function runIngest(manual: boolean) {
    if (busy) return;
    setBusy(true);
    const t = new Date().toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    let outcome = "error";
    try {
      const res = await fetch("/api/demo/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ingesta" }),
      });
      const data = await res.json();
      outcome = data.ok ? "OK" : "error";
    } catch {
      outcome = "sin conexión";
    }
    setLog((l) =>
      [
        `${t} · ${manual ? "manual" : "programado"} · ${outcome}`,
        ...l,
      ].slice(0, 6),
    );
    setBusy(false);
    router.refresh();
  }

  const runRef = useRef(runIngest);
  runRef.current = runIngest;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => runRef.current(false),
      intervalMin * 60_000,
    );
    return () => clearInterval(id);
  }, [running, intervalMin]);

  const intervalLabel = INTERVALS.find((i) => i.min === intervalMin)?.label;

  return (
    <section className="card">
      <div className="section-title">Programación del pipeline</div>

      <p
        style={{
          fontSize: 13,
          color: "var(--ink-2)",
          marginTop: 8,
          lineHeight: 1.55,
        }}
      >
        La ingesta y la evaluación corren como{" "}
        <b style={{ color: "var(--ink-1)" }}>cron de Vercel</b> (definido en{" "}
        <span className="mono">vercel.json</span>; cadencia diaria en el plan
        actual). El programador de abajo dispara la ingesta al intervalo
        elegido <b style={{ color: "var(--ink-1)" }}>mientras esta consola
        esté abierta</b>.
      </p>

      <div className="label" style={{ marginTop: 16 }}>
        Intervalo del programador
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {INTERVALS.map((iv) => (
          <button
            key={iv.min}
            className={`layer-btn${intervalMin === iv.min ? " active" : ""}`}
            onClick={() => setIntervalMin(iv.min)}
          >
            {iv.label}
          </button>
        ))}
      </div>

      <div
        style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
      >
        <button className="demo-btn" onClick={() => setRunning((r) => !r)}>
          {running ? "Detener programador" : "Iniciar programador"}
        </button>
        <button
          className="demo-btn"
          onClick={() => runIngest(true)}
          disabled={busy}
        >
          {busy ? "Ejecutando…" : "Ejecutar ingesta ahora"}
        </button>
        <span
          className={`chip ${running ? "green" : ""}`}
          style={{ fontSize: 11 }}
        >
          {running
            ? `Programador activo · cada ${intervalLabel}`
            : "Programador detenido"}
        </span>
      </div>

      {log.length > 0 && (
        <>
          <div className="label" style={{ marginTop: 16 }}>
            Ejecuciones recientes
          </div>
          <div
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--ink-2)",
              marginTop: 8,
              lineHeight: 1.8,
            }}
          >
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
