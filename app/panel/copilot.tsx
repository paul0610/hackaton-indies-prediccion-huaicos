"use client";

import { useState } from "react";

// Copiloto agéntico del coordinador: pregunta en lenguaje natural; un agente
// Mistral decide qué herramientas del sistema consultar y razona la respuesta.
// Voz: dictado (STT) y lectura (TTS) con la Web Speech API nativa del navegador.
// En modo "Comando voz" la respuesta se lee en voz alta automáticamente.

const CHIPS = [
  "Resume la situación",
  "¿Qué zona priorizo?",
  "¿Cuántos necesitan ayuda?",
  "¿Qué disparó la alerta?",
];

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export function Copilot({
  onMapFocus,
}: {
  onMapFocus: (value: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
        setSuggestions(
          Array.isArray(data.suggestions) ? data.suggestions : [],
        );
        if (typeof data.mapFocus === "string") onMapFocus(data.mapFocus);
        if (voiceMode && typeof data.answer === "string") speak(data.answer);
      } else {
        setAnswer(`Error: ${data.error ?? "desconocido"}`);
      }
    } catch {
      setAnswer("Error de conexión con el copiloto.");
    } finally {
      setLoading(false);
    }
  }

  // TTS — lee un texto en voz alta (Web Speech API).
  function speak(text: string) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const clean = text.replace(/[*#_`>]/g, "").trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "es-ES";
    u.rate = 1.05;
    const esVoice = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("es"));
    if (esVoice) u.voice = esVoice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    setSpeaking(true);
    synth.speak(u);
  }

  function toggleSpeak() {
    if (!answer) return;
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    speak(answer);
  }

  // STT — dicta la pregunta por voz.
  function startListening() {
    if (listening) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      setAnswer(
        "El dictado por voz necesita Chrome. Puedes escribir la pregunta.",
      );
      return;
    }
    const rec = new Recognition();
    rec.lang = "es-PE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) {
        setQuestion(text);
        ask(text);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  return (
    <section className="copilot" data-tour="copiloto">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span className="ai-mark">∿</span>
        <span className="section-title">Copiloto IA</span>
        <span className="chip cyan" style={{ fontSize: 10, padding: "3px 8px" }}>
          Mistral · agente
        </span>
        <span style={{ flex: 1 }} />
        <div className="voice-switch">
          <button
            className={voiceMode ? "" : "on"}
            onClick={() => setVoiceMode(false)}
          >
            Solo texto
          </button>
          <button
            className={voiceMode ? "on" : ""}
            onClick={() => setVoiceMode(true)}
          >
            Comando voz
          </button>
        </div>
      </div>

      <div className="answer">
        {loading
          ? "Consultando el sistema en vivo…"
          : (answer ??
            "Pregúntame sobre el estado actual. Consulto los datos en vivo con mis herramientas y razono la respuesta.")}
      </div>

      {answer && !loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            className={`voice-btn${speaking ? " active" : ""}`}
            onClick={toggleSpeak}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
            </svg>
            {speaking ? "Detener" : "Escuchar"}
          </button>
          {toolsUsed.length > 0 && (
            <span
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
              Herramientas: {toolsUsed.join(", ")}
            </span>
          )}
        </div>
      )}

      <div className="label" style={{ marginTop: 16 }}>
        Consultas rápidas
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {(suggestions.length > 0 ? suggestions : CHIPS).map((c) => (
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
          placeholder={listening ? "Escuchando…" : "Pregunta al copiloto…"}
        />
        <button
          className={`voice-btn${listening ? " active" : ""}`}
          onClick={startListening}
          disabled={loading || listening}
          title="Dictar la pregunta por voz"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>
        <button className="send-btn" onClick={() => ask()} disabled={loading}>
          {loading ? "…" : "Enviar"}
        </button>
      </div>
    </section>
  );
}
