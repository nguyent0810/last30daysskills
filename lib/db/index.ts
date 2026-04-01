import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

/** Server-side DB client (Next.js routes, worker). */
export function getDb() {
  const sql = neon(requireDatabaseUrl());
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof getDb>;
