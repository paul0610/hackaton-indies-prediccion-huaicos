import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram";
import { query } from "@/lib/db";

// Webhook del bot de Telegram.
// /start  -> suscribe el chat a las alertas y confirma.
// otro    -> recuerda que ya está suscrito.

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
  const from = message?.from;

  try {
    if (chatId && typeof text === "string") {
      if (text.startsWith("/start")) {
        // Suscribir el chat a todas las zonas activas (onboarding mínimo).
        await query(
          `insert into zone_subscriptions
             (zone_id, telegram_chat_id, telegram_user_id, display_name)
           select z.id, $1, $2, $3
             from zones z
             join basins b on b.id = z.basin_id
            where z.active and b.active
           on conflict (zone_id, telegram_chat_id)
             do update set active = true`,
          [
            String(chatId),
            from?.id ? String(from.id) : null,
            from?.first_name ?? from?.username ?? null,
          ],
        );
        await sendMessage({
          chatId,
          text:
            "Bienvenido al <b>Sistema de Alerta Temprana de Huaicos</b>.\n\n" +
            "Quedaste suscrito a las alertas de la Quebrada Quirio (Chosica). " +
            "Si el sistema detecta riesgo de huaico, recibirás aquí la " +
            "<b>PREALERTA</b> o la orden de <b>EVACUACIÓN</b>.",
        });
      } else {
        await sendMessage({
          chatId,
          text: "Ya estás suscrito a las alertas de huaico. Envía /start para reactivar la suscripción.",
        });
      }
    }
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
  }

  // Telegram espera siempre una respuesta 200.
  return NextResponse.json({ ok: true });
}
