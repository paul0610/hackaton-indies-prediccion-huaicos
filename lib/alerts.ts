import { query } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";
import type { RiskLevel } from "@/lib/risk-engine";

type AlertLevel = Exclude<RiskLevel, "clear">;

interface ZoneRow {
  id: string;
  name: string;
  safe_point_name: string | null;
}

interface SubscriptionRow {
  telegram_chat_id: string;
}

/** Construye el texto de alerta para una zona, según el nivel de riesgo. */
function buildMessage(
  level: AlertLevel,
  basinName: string,
  zoneName: string,
  safePoint: string | null,
  etaMin: number,
): string {
  const sp = safePoint ?? "el punto seguro asignado";
  if (level === "evacuate") {
    return (
      `<b>EVACUACIÓN | ${basinName}</b>\n\n` +
      `Riesgo alto y corroborado de huaico aguas arriba.\n` +
      `Zona: ${zoneName}\n` +
      `Tiempo estimado de impacto: ${etaMin} min\n\n` +
      `Evacúa ahora hacia ${sp}. No cruces el cauce ni uses la ribera.`
    );
  }
  if (level === "prealert") {
    return (
      `<b>PREALERTA | ${basinName}</b>\n\n` +
      `El sistema detectó lluvia intensa en la cuenca alta y elevó el riesgo de huaico para tu zona.\n` +
      `Zona: ${zoneName}\n` +
      `Tiempo estimado de impacto: ${etaMin} min\n\n` +
      `Prepárate para evacuar hacia ${sp}. Ten lista tu mochila y documentos. Espera nuevas indicaciones.`
    );
  }
  return (
    `<b>VIGILANCIA | ${basinName}</b>\n\n` +
    `Se detectó una señal de riesgo en la quebrada, aún sin corroborar con datos oficiales.\n` +
    `Zona: ${zoneName}\n\n` +
    `Mantente atento y prepara tu salida por si la alerta sube de nivel.`
  );
}

/**
 * Despacha las alertas de un incidente: por cada zona de la cuenca crea un
 * registro en `alerts`, envía el mensaje por Telegram a los suscriptores
 * y registra cada entrega en `alert_deliveries`.
 */
export async function dispatchAlerts(opts: {
  basinId: number;
  basinName: string;
  incidentId: number;
  level: AlertLevel;
  etaMin: number;
}): Promise<{ zones: number; sent: number; failed: number }> {
  const zones = await query<ZoneRow>(
    `select id, name, safe_point_name
       from zones
      where basin_id = $1 and active`,
    [opts.basinId],
  );

  let sent = 0;
  let failed = 0;

  for (const zone of zones) {
    const text = buildMessage(
      opts.level,
      opts.basinName,
      zone.name,
      zone.safe_point_name,
      opts.etaMin,
    );

    const alertRows = await query<{ id: string }>(
      `insert into alerts (incident_id, zone_id, level, message_text, language, sent_at)
       values ($1, $2, $3, $4, 'es', now())
       returning id`,
      [opts.incidentId, Number(zone.id), opts.level, text],
    );
    const alertId = Number(alertRows[0].id);

    const subs = await query<SubscriptionRow>(
      `select telegram_chat_id
         from zone_subscriptions
        where zone_id = $1 and active`,
      [Number(zone.id)],
    );

    for (const sub of subs) {
      try {
        await sendMessage({ chatId: sub.telegram_chat_id, text });
        await query(
          `insert into alert_deliveries (alert_id, telegram_chat_id, delivery_status)
           values ($1, $2, 'sent')`,
          [alertId, sub.telegram_chat_id],
        );
        sent += 1;
      } catch {
        await query(
          `insert into alert_deliveries (alert_id, telegram_chat_id, delivery_status)
           values ($1, $2, 'failed')`,
          [alertId, sub.telegram_chat_id],
        );
        failed += 1;
      }
    }
  }

  return { zones: zones.length, sent, failed };
}
