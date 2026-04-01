/**
 * Operational check: print job, source runs, item counts, report length from DB.
 * Usage: JOB_ID=<uuid> npm run db:inspect
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  reports,
  researchItems,
  researchJobs,
  researchSourceRuns,
} from "@/lib/db/schema";

const jobId = process.argv[2] ?? process.env.JOB_ID;
if (!jobId) {
  console.error("Usage: npm run db:inspect -- <job-id>");
  process.exit(1);
}

async function main() {
  const db = getDb();
  const [job] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1);
  if (!job) {
    console.error("Job not found:", jobId);
    process.exit(2);
  }

  const runs = await db
    .select()
    .from(researchSourceRuns)
    .where(eq(researchSourceRuns.jobId, jobId));
  const items = await db
    .select({ id: researchItems.id })
    .from(researchItems)
    .where(eq(researchItems.jobId, jobId));
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.jobId, jobId))
    .limit(1);

  console.log(JSON.stringify({ job, sourceRuns: runs, itemCount: items.length, reportChars: report?.content.length ?? 0, reportPreview: report?.content.slice(0, 400) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
