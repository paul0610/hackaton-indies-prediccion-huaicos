// Dispara el replay del demo contra la app desplegada.
// Uso:  node --env-file=.env.local scripts/run-replay.mjs [https://tu-app.vercel.app]

const secret = process.env.CRON_SECRET;
const base =
  process.argv[2] ?? "https://hackaton-indies-prediccion-huaicos.vercel.app";

if (!secret) {
  console.error("Falta CRON_SECRET en .env.local");
  process.exit(1);
}

const res = await fetch(`${base.replace(/\/+$/, "")}/api/demo/replay`, {
  headers: { authorization: `Bearer ${secret}` },
});
const data = await res.json();
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(data, null, 2));
if (!res.ok) process.exitCode = 1;
