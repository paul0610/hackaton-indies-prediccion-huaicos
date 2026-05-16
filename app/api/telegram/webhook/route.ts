import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram";

// Webhook del bot de Telegram. S0: echo + /start.
// Los handlers POST nunca se prerenderizan.

export async function POST(req: Request) {
  // Verificar que el webhook viene de Telegram (secret_token).
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.telegramWebhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const chatId: number | undefined = message?.chat?.id;
  const text: string | undefined = message?.text;

  try {
    if (chatId && typeof text === "string") {
      if (text.startsWith("/start")) {
        await sendMessage({
          chatId,
          text: "Bienvenido al <b>Sistema de Alerta Temprana de Huaicos</b>.\nBot en construcción — pronto podrás registrarte para recibir alertas.",
        });
      } else {
        await sendMessage({ chatId, text: `Recibí: ${text}` });
      }
    }
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
  }

  // Telegram espera siempre una respuesta 200.
  return NextResponse.json({ ok: true });
}
