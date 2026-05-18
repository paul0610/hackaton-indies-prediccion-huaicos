"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Tour guiado del panel: globos que explican para qué sirve cada control.
// Se autoarranca en la primera visita (queda registrado en localStorage) y
// se puede relanzar cuando se quiera con el botón "Guía" de la barra superior.

interface TourStep {
  anchor: string | null; // valor de data-tour; null = globo centrado
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    anchor: null,
    title: "Bienvenido al panel",
    body: "Te muestro en medio minuto para qué sirve cada control. Puedes saltarlo cuando quieras.",
  },
  {
    anchor: "nivel",
    title: "Nivel de riesgo",
    body: "El estado de la cuenca en vivo, de SIN RIESGO (N0) a EVACUACIÓN (N3). Cambia solo cuando el motor de riesgo reevalúa.",
  },
  {
    anchor: "bot",
    title: "Bot de Telegram",
    body: "Abre el bot por el que los vecinos reciben las alertas y responden “estoy a salvo” o “necesito ayuda” con su ubicación.",
  },
  {
    anchor: "admin",
    title: "Consola de administración",
    body: "Lleva a /admin: ahí ves el estado del pipeline y programas cada cuánto se ingiere la lluvia.",
  },
  {
    anchor: "demo",
    title: "Controles de demostración",
    body: "“Simular evacuación” dispara el escenario completo de Quirio; “Volver a calma” lo resetea. Solo para demos: no afectan el monitoreo real.",
  },
  {
    anchor: "resumen",
    title: "Diagnóstico e indicadores",
    body: "A la izquierda, por qué la cuenca está en este nivel y qué lo disparó. A la derecha: población expuesta, ayuda pendiente y lluvia de las últimas 3 h.",
  },
  {
    anchor: "mapa",
    title: "Mapa en vivo",
    body: "Los botones Zonas / Ciudadanos / Refugios cambian la capa que ves. Abajo a la derecha están los controles de zoom.",
  },
  {
    anchor: "copiloto",
    title: "Copiloto IA",
    body: "Pregúntale en lenguaje natural: consulta el estado real, enfoca el mapa y razona la respuesta. Con “Comando voz” te contesta hablando; el micrófono dicta tu pregunta.",
  },
  {
    anchor: "cola",
    title: "Cola de ayuda",
    body: "Los vecinos que respondieron, con los pedidos de ayuda primero. Cada caso trae su ubicación para coordinar la brigada.",
  },
];

const SEEN_KEY = "tp-tour-v1";
const POP_W = 320;

export function PanelTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = useCallback(() => {
    setActive(false);
    setStep(0);
    setRect(null);
    setPos(null);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* sin localStorage: el tour podría reaparecer, no es crítico */
    }
  }, []);

  function openTour() {
    setStep(0);
    setRect(null);
    setPos(null);
    setActive(true);
  }

  // Autoarranque en la primera visita.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = true; // sin localStorage: no insistimos con el autoarranque
    }
    if (seen) return;
    const t = window.setTimeout(() => setActive(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  // Lleva el ancla del paso a la vista y la mantiene medida ante scroll,
  // resize o el auto-refresh del panel.
  useEffect(() => {
    if (!active) return;
    const anchor = STEPS[step].anchor;

    const measure = () => {
      if (!anchor) {
        setRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${anchor}"]`,
      );
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect((prev) =>
        prev &&
        prev.top === r.top &&
        prev.left === r.left &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : r,
      );
    };

    if (anchor) {
      document
        .querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const id = window.setInterval(measure, 900);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      window.clearInterval(id);
    };
  }, [active, step]);

  // Atajos de teclado: Esc cierra, flechas navegan.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" && !last) setStep((s) => s + 1);
      else if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, step, last, finish]);

  // Posiciona el globo respecto del ancla (o lo deja centrado si no hay).
  useEffect(() => {
    if (!active || !rect) {
      setPos(null);
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popH = popRef.current?.offsetHeight ?? 200;
    const gap = 14;

    let top: number;
    if (vh - rect.bottom >= popH + gap) {
      top = rect.bottom + gap;
    } else if (rect.top >= popH + gap) {
      top = rect.top - gap - popH;
    } else {
      top = (vh - popH) / 2;
    }
    top = Math.min(Math.max(top, gap), Math.max(gap, vh - popH - gap));

    let left = rect.left + rect.width / 2 - POP_W / 2;
    left = Math.min(Math.max(left, gap), Math.max(gap, vw - POP_W - gap));

    setPos({ top, left });
  }, [active, rect, step]);

  if (!active) {
    return (
      <button
        type="button"
        className="tour-launch"
        onClick={openTour}
        title="Recorrido guiado del panel"
      >
        <span className="tour-launch-q" aria-hidden="true">
          ?
        </span>
        Guía
      </button>
    );
  }

  return createPortal(
    <>
      <div className={`tp-tour-backdrop${rect ? "" : " veil"}`} />
      {rect && (
        <div
          className="tp-tour-spot"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <div
        ref={popRef}
        className={`tp-tour-pop${pos ? "" : " centered"}`}
        style={pos ? { top: pos.top, left: pos.left } : undefined}
      >
        <div className="tt-count">
          Paso {step + 1} de {STEPS.length}
        </div>
        <div className="tt-title">{current.title}</div>
        <div className="tt-body">{current.body}</div>
        <div className="tt-nav">
          {!last && (
            <button type="button" className="tt-skip" onClick={finish}>
              Saltar tour
            </button>
          )}
          <span style={{ flex: 1 }} />
          {step > 0 && (
            <button
              type="button"
              className="tt-btn ghost"
              onClick={() => setStep((s) => s - 1)}
            >
              Anterior
            </button>
          )}
          <button
            type="button"
            className="tt-btn"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
          >
            {last ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
