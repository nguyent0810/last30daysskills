import { asc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { researchJobs } from "@/lib/db/schema";

/** Single-worker MVP: take oldest queued job and mark running. */
export async function claimNextQueuedJob(db: Db) {
  const row = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.status, "queued"))
    .orderBy(asc(researchJobs.createdAt))
    .limit(1);

  const job = row[0];
  if (!job) return null;

  await db
    .update(researchJobs)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(researchJobs.id, job.id));

  return { ...job, status: "running" as const };
}
