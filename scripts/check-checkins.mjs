// Diagnóstico: inspecciona los check-ins ciudadanos y las suscripciones.
// Uso:  node --env-file=.env.local scripts/check-checkins.mjs
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const checkins = await pool.query(
  `select * from citizen_checkins order by created_at desc limit 20`,
);
console.log(`\n=== citizen_checkins: ${checkins.rowCount} filas ===`);
console.table(checkins.rows);

const subs = await pool.query(`select * from zone_subscriptions limit 10`);
console.log(`\n=== zone_subscriptions: ${subs.rowCount} filas ===`);
console.table(subs.rows);

await pool.end();
