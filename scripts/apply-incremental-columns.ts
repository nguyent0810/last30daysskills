/**
 * Applies idempotent incremental SQL for researches.display_title and researches.archived_at.
 * Safe to re-run. Requires DATABASE_URL (e.g. via .env.local).
 */
import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url?.trim()) {
  console.error("DATABASE_URL is not set. Use .env.local or export DATABASE_URL.");
  process.exit(1);
}

const files = ["0001_researches_display_title.sql", "0002_researches_archived_at.sql"];

async function main() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const f of files) {
      const sql = readFileSync(join(process.cwd(), "drizzle", f), "utf8");
      console.log(`Applying drizzle/${f}...`);
      await client.query(sql);
    }
    console.log("Done. Columns display_title and/or archived_at are present (IF NOT EXISTS).");
  } finally {
    await client.end();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
