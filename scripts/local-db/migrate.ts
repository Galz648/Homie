/**
 * Apply Drizzle SQL migrations (drizzle-orm migrator).
 * Prefer this over `drizzle-kit migrate` — kit TUI hangs in some non-TTY envs.
 *
 * Usage:
 *   DATABASE_URL=postgresql://homie:homie@127.0.0.1:54329/homie bun scripts/local-db/migrate.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (or DIRECT_URL)");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsFolder = join(root, "drizzle");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder });
await client.end();
console.log("ok: drizzle migrations applied");
