import { env } from "@/lib/env";

const API_BASE = "https://api.telegram.org";

interface SendMessageOptions {
  chatId: number | string;
  text: string;
  /** Teclado inline u otro markup de Telegram. */
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
