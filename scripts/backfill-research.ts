/**
 * Idempotent backfill: one `researches` row per `research_jobs` row where `research_id` IS NULL,
 * then set `research_jobs.research_id`.
 *
 * Run after PR1 DDL is applied (db:push or drizzle/0000_researches_and_research_id.sql).
 *
 *   npm run db:backfill-research
 *
 * Partial failure: re-run; only NULL `research_id` rows are processed.
 * Verify: SELECT COUNT(*) FROM research_jobs WHERE research_id IS NULL;  → expect 0 after success.
 *
 * Exits cleanly: always `await closeDb()` in `finally` so the pg pool does not keep Node alive.
 */

import { config } from "dotenv";
import { eq, isNull, sql } from "drizzle-orm";
import { closeDb, getDb, requireDatabaseUrl } from "@/lib/db";
import { researches, researchJobs } from "@/lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

requireDatabaseUrl();

const BATCH = 200;

async function main() {
  try {
    const db = getDb();

    const [{ c: pending }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(researchJobs)
      .where(isNull(researchJobs.researchId));

    console.log(`[backfill-research] jobs with research_id IS NULL: ${pending}`);

    if (pending === 0) {
      console.log("[backfill-research] nothing to do (already complete).");
      return;
    }

    let processed = 0;

    while (true) {
      const batch = await db
        .select({
          id: researchJobs.id,
          userId: researchJobs.userId,
          topic: researchJobs.topic,
          createdAt: researchJobs.createdAt,
          updatedAt: researchJobs.updatedAt,
        })
        .from(researchJobs)
        .where(isNull(researchJobs.researchId))
        .limit(BATCH);

      if (batch.length === 0) break;

      for (const job of batch) {
        await db.transaction(async (tx) => {
          const [r] = await tx
            .insert(researches)
            .values({
              userId: job.userId,
              topic: job.topic,
              createdAt: job.createdAt,
              updatedAt: job.updatedAt,
            })
            .returning({ id: researches.id });

          await tx
            .update(researchJobs)
            .set({ researchId: r.id })
            .where(eq(researchJobs.id, job.id));
        });
        processed += 1;
      }

      console.log(`[backfill-research] processed ${processed} / ${pending} …`);
    }

    const [{ c: remaining }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(researchJobs)
      .where(isNull(researchJobs.researchId));

    console.log(`[backfill-research] done. processed=${processed}, remaining NULL=${remaining}`);
    if (remaining > 0) {
      process.exitCode = 1;
    }
  } finally {
    await closeDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
