import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

/** Connect to Supabase Postgres (use pooled DATABASE_URL, port 6543). */
export function createDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

export * from "./schema.ts";
