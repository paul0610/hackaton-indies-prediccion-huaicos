import { env } from "@/lib/env";

const API_BASE = "https://api.telegram.org";

interface SendMessageOptions {
  chatId: number | string;
  text: string;
  /** Teclado inline, teclado de respuesta u otro markup de Telegram. */
  replyMarkup?: unknown;
}

/** Envía un mensaje de texto a través del bot de Telegram. */
export async function sendMessage(opts: SendMessageOptions): Promise<void> {
  const token = env.telegramBotToken();
  const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: opts.text,
      parse_mode: "HTML",
      reply_markup: opts.replyMarkup,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram sendMessage falló (${res.status}): ${detail}`);
  }
}

/**
 * Responde un callback_query. Telegram lo exige tras pulsar un botón inline
 * (si no, el botón queda con un reloj de carga). Best-effort: no lanza.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  if (!callbackQueryId) return;
  const token = env.telegramBotToken();
  try {
    await fetch(`${API_BASE}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch (err) {
    console.error("answerCallbackQuery falló:", err);
  }
}
