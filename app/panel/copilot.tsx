"use client";

import { useState } from "react";

// Copiloto agéntico del coordinador: pregunta en lenguaje natural; un agente
// Mistral decide qué herramientas del sistema consultar y razona la respuesta.

const CHIPS = [
  "Resume la situación",
  "¿Qué zona priorizo?",
  "¿Cuántos necesitan ayuda?",
  "¿Qué disparó la alerta?",
];

export function Copilot() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(preset?: string) {
    const q = (preset ?? question).trim();
    if (!q || loading) return;
    setQuestion(q);
    setLoading(true);
    setAnswer(null);
    setToolsUsed([]);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.ok) {
        setAnswer(data.answer);
        setToolsUsed(Array.isArray(data.toolsUsed) ? data.toolsUsed : []);
      } else {
        setAnswer(`Error: ${data.error ?? "desconocido"}`);
      }
    } catch {
      setAnswer("Error de conexión con el copiloto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="copilot">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span className="ai-mark">∿</span>
        <span className="section-title">Copiloto IA</span>
        <span className="chip cyan" style={{ fontSize: 10, padding: "3px 8px" }}>
          Mistral · agente
        </span>
      </div>

      <div className="answer">
        {loading
          ? "Consultando el sistema en vivo…"
          : (answer ??
            "Pregúntame sobre el estado actual. Consulto los datos en vivo con mis herramientas y razono la respuesta.")}
      </div>

      {toolsUsed.length > 0 && (
        <div
          className="mono"
          style={{ marginTop: 6, fontSize: 11, color: "var(--ink-3)" }}
        >
          Herramientas consultadas: {toolsUsed.join(", ")}
        </div>
      )}

      <div className="label" style={{ marginTop: 16 }}>
        Consultas rápidas
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}
      >
        {CHIPS.map((c) => (
          <button
            key={c}
            className="prompt-chip"
            onClick={() => ask(c)}
            disabled={loading}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="input-row">
        <span style={{ color: "var(--ink-3)", fontSize: 14 }}>›</span>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask();
          }}
          placeholder="Pregunta al copiloto…"
        />
        <button
          className="send-btn"
          onClick={() => ask()}
          disabled={loading}
        >
          {loading ? "…" : "Enviar"}
        </button>
      </div>
    </section>
  );
}
