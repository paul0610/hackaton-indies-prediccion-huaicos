// Dispara los crons reales (ingesta de lluvia Open-Meteo + evaluacion de
// riesgo) contra la app desplegada. Deja el panel en su estado real/live.
// Uso:  node --env-file=.env.local scripts/run-cron.mjs [https://tu-app.vercel.app]

const secret = process.env.CRON_SECRET;
const base =
  process.argv[2] ?? "https://hackaton-indies-prediccion-huaicos.vercel.app";

if (!secret) {
  console.error("Falta CRON_SECRET en .env.local");
  process.exit(1);
}

for (const path of ["/api/cron/ingest-rain", "/api/cron/evaluate-risk"]) {
  const res = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const data = await res.json().catch(() => ({}));
  console.log(`${path} -> HTTP ${res.status}`);
  console.log(JSON.stringify(data, null, 2));
  if (!res.ok) process.exitCode = 1;
}
