import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

/** Single shared pool (worker + Next.js API routes in dev share process; avoid new Pool per getDb()). */
let pool: Pool | null = null;

/** Server-side DB client (Next.js routes, worker). Uses `pg` — works with Neon pooler URLs and local Postgres. */
export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 10,
    });
  }
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof getDb>;
