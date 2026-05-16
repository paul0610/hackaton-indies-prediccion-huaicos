import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage, answerCallbackQuery } from "@/lib/telegram";
import { query } from "@/lib/db";

// Webhook del bot de Telegram:
// - texto /start    -> suscribe el chat a una zona
// - callback_query  -> registra la respuesta del vecino (a salvo / necesita ayuda)
// - location        -> guarda la ubicación GPS del último check-in

const LOCATION_KEYBOARD = {
  keyboard: [[{ text: "Compartir mi ubicación", request_location: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.telegramWebhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);

  try {
    if (update?.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update?.message?.location) {
      await handleLocation(update.message);
    } else if (typeof update?.message?.text === "string") {
      await handleText(update.message);
    }
  } catch (err) {
    console.error("Error procesando update de Telegram:", err);
  }

  // Telegram espera siempre una respuesta 200.
  return NextResponse.json({ ok: true });
}

// /start -> suscribir el chat a la zona de mayor prioridad.
async function handleText(message: any): Promise<void> {
  const chatId = message?.chat?.id;
  const text: string = message?.text ?? "";
  const from = message?.from;
  if (!chatId) return;

  if (text.startsWith("/start")) {
    await query(
      `update zone_subscriptions set active = false where telegram_chat_id = $1`,
      [String(chatId)],
    );
    const zoneRows = await query<{ id: string; name: string }>(
      `select z.id, z.name
         from zones z join basins b on b.id = z.basin_id
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
         on conflict (zone_id, telegram_chat_id) do update set active = true`,
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

// Botón de respuesta a una alerta: a salvo / necesita ayuda.
async function handleCallback(cb: any): Promise<void> {
  const chatId = cb?.message?.chat?.id;
  const data: string = cb?.data ?? "";
  const cbId: string = cb?.id ?? "";

  if (!chatId) {
    await answerCallbackQuery(cbId);
    return;
  }
  const status =
    data === "ack:help" ? "help" : data === "ack:safe" ? "safe" : null;
  if (!status) {
    await answerCallbackQuery(cbId);
    return;
  }

  // Ubicar la zona/cuenca del vecino por su suscripción.
  const zoneRows = await query<{ zone_id: string; basin_id: string }>(
    `select z.id as zone_id, z.basin_id
       from zone_subscriptions zs
       join zones z on z.id = zs.zone_id
      where zs.telegram_chat_id = $1 and zs.active
      order by zs.id desc
      limit 1`,
    [String(chatId)],
  );
  const zoneId = zoneRows[0]?.zone_id ? Number(zoneRows[0].zone_id) : null;
  const basinId = zoneRows[0]?.basin_id ? Number(zoneRows[0].basin_id) : null;

  await query(
    `insert into citizen_checkins (basin_id, zone_id, telegram_chat_id, status)
     values ($1, $2, $3, $4)`,
    [basinId, zoneId, String(chatId), status],
  );

  await answerCallbackQuery(
    cbId,
    status === "help" ? "Registrado: necesitas ayuda." : "Registrado: a salvo.",
  );

  const ask =
    status === "help"
      ? "Registramos que <b>necesitas ayuda</b>. Comparte tu ubicación para que el coordinador te encuentre."
      : "Registramos que estás <b>a salvo</b>. Comparte tu ubicación para confirmar dónde estás.";
  await sendMessage({ chatId, text: ask, replyMarkup: LOCATION_KEYBOARD });
}

// Ubicación GPS: se asocia al último check-in del vecino que esté sin ubicar.
async function handleLocation(message: any): Promise<void> {
  const chatId = message?.chat?.id;
  const loc = message?.location;
  if (!chatId || !loc) return;

  await query(
    `update citizen_checkins set lat = $1, lon = $2
      where id = (
        select id from citizen_checkins
         where telegram_chat_id = $3 and lat is null
         order by created_at desc
         limit 1
      )`,
    [loc.latitude, loc.longitude, String(chatId)],
  );

  await sendMessage({
    chatId,
    text: "Ubicación recibida. El coordinador ya puede ubicarte en el mapa. Mantente atento a nuevas indicaciones.",
    replyMarkup: { remove_keyboard: true },
  });
}
