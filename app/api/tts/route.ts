import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/minimax";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Voz del copiloto: recibe texto y lo sintetiza con MiniMax T2A, devolviendo
// el MP3 en base64. La API key de MiniMax se resuelve aquí, del lado del
// servidor — nunca llega al navegador. Si MiniMax falla, responde ok:false
// y el cliente cae al TTS nativo del navegador.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "Falta el texto a sintetizar." },
        { status: 400 },
      );
    }

    const result = await synthesizeSpeech(text);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
