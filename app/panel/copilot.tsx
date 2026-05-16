"use client";

import { useState } from "react";

// Copiloto agéntico del coordinador: pregunta en lenguaje natural; un agente
// Mistral decide qué herramientas del sistema consultar y razona la respuesta.
export function Copilot() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
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
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        marginTop: 16,
      }}
    >
      <h2
        style={{
          margin: "0 0 .6rem",
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "#6b7280",
        }}
      >
        Copiloto del coordinador · agente IA
      </h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask();
          }}
          placeholder="Pregunta sobre el estado actual..."
          style={{
            flex: 1,
            padding: ".55rem .7rem",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
          }}
        />
        <button
          onClick={ask}
          disabled={loading}
          style={{
            padding: ".55rem 1.1rem",
            border: "none",
            borderRadius: 8,
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            fontSize: 14,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "..." : "Preguntar"}
        </button>
      </div>
      {answer && (
        <p style={{ marginTop: ".75rem", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
          {answer}
        </p>
      )}
      {toolsUsed.length > 0 && (
        <div style={{ marginTop: ".4rem", fontSize: 12, color: "#9ca3af" }}>
          El agente consultó: {toolsUsed.join(", ")}
        </div>
      )}
      <div style={{ marginTop: ".5rem", fontSize: 12, color: "#9ca3af" }}>
        Ej.: &quot;resume la situación&quot; · &quot;¿cuántos necesitan ayuda y
        dónde?&quot; · &quot;¿qué zona priorizo?&quot;
      </div>
    </section>
  );
}
