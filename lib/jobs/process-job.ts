import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import {
  researchItems,
  researchJobs,
  reports,
  researchSourceRuns,
} from "@/lib/db/schema";
import { runFetchAndRank } from "@/lib/research/pipeline";

/**
 * Worker: load job, run pipeline, persist runs/items/report, set job status.
 * Job fails only if both sources error (no usable data).
 */
export async function processJob(db: Db, jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const result = await runFetchAndRank(job.topic);

  const hnRunStatus = result.hn.error ? "failed" : "succeeded";
  const pmRunStatus = result.polymarket.error ? "failed" : "succeeded";
  const hnCount = result.items.filter((i) => i.source === "hn").length;
  const pmCount = result.items.filter((i) => i.source === "polymarket").length;

  if (result.hn.error && result.polymarket.error) {
    await db
      .update(researchJobs)
      .set({
        status: "failed",
        error: `HN: ${result.hn.error}; Polymarket: ${result.polymarket.error}`,
        updatedAt: new Date(),
      })
      .where(eq(researchJobs.id, jobId));
    await db.insert(researchSourceRuns).values({
      jobId,
      source: "hn",
      status: "failed",
      error: result.hn.error,
      itemCount: 0,
    });
    await db.insert(researchSourceRuns).values({
      jobId,
      source: "polymarket",
      status: "failed",
      error: result.polymarket.error,
      itemCount: 0,
    });
    return;
  }

  await db.insert(researchSourceRuns).values({
    jobId,
    source: "hn",
    status: hnRunStatus,
    error: result.hn.error ?? null,
    itemCount: hnCount,
  });
  await db.insert(researchSourceRuns).values({
    jobId,
    source: "polymarket",
    status: pmRunStatus,
    error: result.polymarket.error ?? null,
    itemCount: pmCount,
  });

  for (const it of result.items) {
    await db.insert(researchItems).values({
      jobId,
      source: it.source,
      title: it.title,
      url: it.url,
      snippet: it.snippet,
      score: it.score,
      raw: it.raw !== undefined ? (it.raw as Record<string, unknown>) : null,
    });
  }

  await db.insert(reports).values({
    jobId,
    content: result.report,
  });

  await db
    .update(researchJobs)
    .set({
      status: "succeeded",
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(researchJobs.id, jobId));
}
