// Aplica el esquema y el seed a la base de datos.
// Uso:  npm run db:apply   (carga .env.local vía node --env-file)

import { readFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;

const FILES = ["db/schema.sql", "db/seed_quirio.sql"];

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
  console.log("Conectado a la base de datos.");
  for (const file of FILES) {
    const sql = await readFile(file, "utf8");
    await client.query(sql);
    console.log(`Aplicado: ${file}`);
  }
  console.log("Esquema y seed aplicados correctamente.");
} catch (err) {
  console.error("Error al aplicar el esquema:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
