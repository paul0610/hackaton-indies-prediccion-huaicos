import { NextResponse } from "next/server";
import { getCoordinatorView } from "@/lib/dashboard";
import { runAgent, type AgentTool } from "@/lib/mistral";
import { retrieveKnowledge } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

// Herramientas que el copiloto agéntico puede consultar.
const TOOLS: AgentTool[] = [
  {
    name: "obtener_estado_actual",
    description:
      "Nivel de riesgo actual, umbral efectivo, lluvia reciente, susceptibilidad e incidente abierto.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "listar_zonas",
    description: "Zonas pobladas de la cuenca con su prioridad y punto seguro.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "obtener_cola_de_ayuda",
    description:
      "Vecinos que respondieron a la alerta, su estado (a salvo / necesita ayuda), su ubicación y cuántos necesitan ayuda.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "obtener_alertas_recientes",
    description: "Últimas alertas emitidas por el sistema.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "consultar_conocimiento",
    description:
      "Base de conocimiento del sistema: protocolos de evacuación por nivel, " +
      "metodología (umbrales, backtest 2017), indicadores de huaico, zonas de " +
      "Quirio, escalamiento a organismos y guía operativa. Úsala para preguntas " +
      "de procedimiento, criterio o 'por qué' — no para el estado en vivo.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "La pregunta o tema a buscar en la base de conocimiento.",
        },
      },
      required: ["query"],
    },
  },
];

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { question?: unknown };
    const question =
      typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json(
        { ok: false, error: "Falta la pregunta" },
        { status: 400 },
      );
    }

    const view = await getCoordinatorView();

    const execute = async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<string> => {
      switch (name) {
        case "obtener_estado_actual":
          return JSON.stringify({
            basin: view.basin,
            snapshot: view.snapshot,
            rain: view.rain,
            susceptibility: view.susceptibility,
            incident: view.incident,
          });
        case "listar_zonas":
          return JSON.stringify(view.zones);
        case "obtener_cola_de_ayuda":
          return JSON.stringify({
            helpCount: view.helpCount,
            checkins: view.checkins,
          });
        case "obtener_alertas_recientes":
          return JSON.stringify(view.recentAlerts);
        case "consultar_conocimiento": {
          const q =
            typeof args.query === "string" && args.query.trim()
              ? args.query
              : question;
          return await retrieveKnowledge(q);
        }
        default:
          return "Herramienta desconocida.";
      }
    };

    const system =
      "Eres el copiloto del coordinador de emergencias de un sistema de alerta " +
      "temprana de huaicos (Quebrada Quirio, Chosica). Tienes herramientas para " +
      "consultar el estado del sistema en vivo y una base de conocimiento con " +
      "protocolos, metodología e indicadores. Úsalas para responder con datos " +
      "reales, nunca inventes. Para preguntas de procedimiento, criterio o 'por " +
      "qué' usa consultar_conocimiento; para el estado actual usa las demás. " +
      "Puedes llamar varias herramientas si hace falta. " +
      "Responde breve, claro y operativo, en español.";

    const { answer, toolsUsed } = await runAgent({
      system,
      user: question,
      tools: TOOLS,
      execute,
    });

    return NextResponse.json({ ok: true, answer, toolsUsed });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
