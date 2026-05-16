// Registra el webhook del bot de Telegram contra la URL desplegada.
// Uso:  node --env-file=.env.local scripts/set-webhook.mjs https://tu-app.vercel.app

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const baseUrl = process.argv[2];

if (!token || !secret) {
  console.error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET en .env.local");
  process.exit(1);
}
if (!baseUrl || !baseUrl.startsWith("https://")) {
  console.error(
    "Uso: node --env-file=.env.local scripts/set-webhook.mjs https://tu-app.vercel.app",
  );
  process.exit(1);
}

const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/api/telegram/webhook`;

const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  }),
});
const setData = await setRes.json();
console.log("setWebhook ->", JSON.stringify(setData));

const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const info = await infoRes.json();
console.log("getWebhookInfo ->", JSON.stringify(info, null, 2));

if (!setData.ok) {
  process.exitCode = 1;
}
