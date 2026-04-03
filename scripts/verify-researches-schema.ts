/**
 * Fails fast if `researches` is missing columns the app expects (share + observability).
 * Run against production DATABASE_URL after deploy or before smoke tests.
 *
 *   npm run db:verify-schema
 *   DATABASE_URL=... npx tsx scripts/verify-researches-schema.ts
 */
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

/** Columns required by current app code paths (Phase 5 / 5.6). */
const REQUIRED_RESEARCHES_COLUMNS = [
  "share_token",
  "share_feedback_up",
  "share_feedback_down",
  "share_copy_count",
  "public_view_count",
  "last_shared_at",
  "last_public_view_at",
] as const;

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl?.trim()) {
    console.error("[verify-researches-schema] DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new pg.Client(pgConfigFromUrl(rawUrl));
  await client.connect();
  try {
    const { rows } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'researches'`
    );
    const present = new Set(rows.map((r) => r.column_name));
    const missing = REQUIRED_RESEARCHES_COLUMNS.filter((c) => !present.has(c));

    if (missing.length > 0) {
      console.error(
        "[verify-researches-schema] researches table is missing required columns:\n  - " +
          missing.join("\n  - ") +
          "\n\nApply incremental migrations on this database, then retry:\n" +
          "  npm run db:migrate:incremental\n" +
          "(Requires drizzle/0004_researches_share.sql and 0005_researches_observability.sql to have run.)"
      );
      process.exit(1);
    }

    console.log("[verify-researches-schema] OK — researches has all required share/observability columns.");
  } finally {
    await client.end();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
