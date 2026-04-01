import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { researchJobs } from "@/lib/db/schema";

export async function markJobFailed(db: Db, jobId: string, message: string) {
  await db
    .update(researchJobs)
    .set({
      status: "failed",
      error: message.slice(0, 4000),
      updatedAt: new Date(),
    })
    .where(eq(researchJobs.id, jobId));
}
