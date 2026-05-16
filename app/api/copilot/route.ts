import { NextResponse } from "next/server";
import { getCoordinatorView } from "@/lib/dashboard";
import { chatComplete } from "@/lib/mistral";

export const dynamic = "force-dynamic";

// Copiloto del coordinador (Capa H): responde preguntas sobre el estado
// actual usando Mistral con el contexto en vivo del panel.
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
    const system =
      "Eres el copiloto del coordinador de emergencias de un sistema de alerta " +
      "temprana de huaicos. Respondes preguntas sobre el estado actual usando " +
      "ÚNICAMENTE el contexto JSON proporcionado. Sé breve, claro y operativo. " +
      "Español. Si un dato no está en el contexto, dilo con franqueza.";
    const answer = await chatComplete(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `Estado actual (JSON):\n${JSON.stringify(view)}\n\nPregunta: ${question}`,
        },
      ],
      { maxTokens: 350 },
    );

    return NextResponse.json({ ok: true, answer });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
