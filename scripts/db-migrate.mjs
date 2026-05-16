// Aplica un archivo de migración SQL a la base de datos.
// Uso:  node --env-file=.env.local scripts/db-migrate.mjs db/migration_xxx.sql

import { readFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const file = process.argv[2];

if (!file) {
  console.error("Uso: node --env-file=.env.local scripts/db-migrate.mjs <archivo.sql>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL (revisa .env.local).");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const sql = await readFile(file, "utf8");
  await client.query(sql);
  console.log(`Migración aplicada: ${file}`);
} catch (err) {
  console.error("Error al aplicar la migración:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
