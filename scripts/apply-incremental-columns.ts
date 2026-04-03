/**
 * Applies idempotent incremental SQL for researches.display_title and researches.archived_at.
 * Safe to re-run. Requires DATABASE_URL (e.g. via .env.local).
 *
 * Parses the URL explicitly so Neon pooler URLs and .env quoting behave reliably with `pg`.
 */
import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

function normalizeDatabaseUrl(raw: string): string {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s;
}

function pgConfigFromUrl(raw: string): pg.ClientConfig {
  const connectionString = normalizeDatabaseUrl(raw);
  const u = new URL(connectionString);
  const database = u.pathname.replace(/^\//, "").split("?")[0];
  const user = decodeURIComponent(u.username);
  const password = decodeURIComponent(u.password);
  const sslMode = u.searchParams.get("sslmode");
  const useSsl =
    sslMode === "require" ||
    sslMode === "verify-full" ||
    u.hostname.includes("neon.tech") ||
    u.hostname.includes("amazonaws.com");

  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: true } : undefined,
  };
}

const files = [
  "0001_researches_display_title.sql",
  "0002_researches_archived_at.sql",
  "0003_researches_pin_note.sql",
  "0004_researches_share.sql",
  "0005_researches_observability.sql",
];

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl?.trim()) {
    console.error("DATABASE_URL is not set. Use .env.local or export DATABASE_URL.");
    process.exit(1);
  }
  const config = pgConfigFromUrl(rawUrl);
  if (!config.password) {
    console.error("DATABASE_URL has no password segment after parsing. Check the URL format.");
    process.exit(1);
  }
  const client = new pg.Client(config);
  await client.connect();
  try {
    for (const f of files) {
      const sql = readFileSync(join(process.cwd(), "drizzle", f), "utf8");
      console.log(`Applying drizzle/${f}...`);
      await client.query(sql);
    }
    console.log("Done. Incremental columns applied (IF NOT EXISTS).");
  } finally {
    await client.end();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
