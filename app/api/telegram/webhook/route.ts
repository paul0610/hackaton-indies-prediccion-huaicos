import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram";
import { query } from "@/lib/db";

// Webhook del bot de Telegram.
// /start  -> suscribe el chat a una zona (la de mayor prioridad) y confirma.
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
        // Reiniciar las suscripciones previas de este chat...
        await query(
          `update zone_subscriptions set active = false where telegram_chat_id = $1`,
          [String(chatId)],
        );
        // ...y suscribir a la zona de mayor prioridad (onboarding mínimo).
        const zoneRows = await query<{ id: string; name: string }>(
          `select z.id, z.name
             from zones z
             join basins b on b.id = z.basin_id
            where z.active and b.active
            order by z.priority asc, z.id asc
            limit 1`,
        );
        let zoneName = "tu zona";
        if (zoneRows.length > 0) {
          zoneName = zoneRows[0].name;
          await query(
            `insert into zone_subscriptions
               (zone_id, telegram_chat_id, telegram_user_id, display_name, active)
             values ($1, $2, $3, $4, true)
             on conflict (zone_id, telegram_chat_id)
               do update set active = true`,
            [
              Number(zoneRows[0].id),
              String(chatId),
              from?.id ? String(from.id) : null,
              from?.first_name ?? from?.username ?? null,
            ],
          );
        }
        await sendMessage({
          chatId,
          text:
            "Bienvenido al <b>Sistema de Alerta Temprana de Huaicos</b>.\n\n" +
            `Quedaste suscrito a las alertas de la zona <b>${zoneName}</b> ` +
            "(Quebrada Quirio, Chosica).\n\n" +
            "Si el sistema detecta riesgo de huaico recibirás aquí la " +
            "<b>PREALERTA</b> y, si se confirma, la orden de <b>EVACUACIÓN</b>.",
        });
      } else {
        await sendMessage({
          chatId,
          text: "Ya estás suscrito a las alertas de huaico. Envía /start para reiniciar tu suscripción.",
        });
      }
    }
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
  }

  // Telegram espera siempre una respuesta 200.
  return NextResponse.json({ ok: true });
}
