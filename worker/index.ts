/**
 * Phase 1A worker: poll Postgres for queued jobs, run pipeline.
 * Deploy target: Railway (long-running process).
 *
 * Load .env.local / .env so DATABASE_URL works when not exported in shell.
 */
import { config } from "dotenv";
import { getDb } from "@/lib/db";
import { claimNextQueuedJob } from "@/lib/jobs/claim-next";
import { markJobFailed } from "@/lib/jobs/mark-failed";
import { processJob } from "@/lib/jobs/process-job";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 3000);

async function tick() {
  const db = getDb();
  const job = await claimNextQueuedJob(db);
  if (!job) return;
  try {
    await processJob(getDb(), job.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markJobFailed(getDb(), job.id, msg);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required (set in .env.local or environment)");
    process.exit(1);
  }
  console.log(`Worker polling every ${POLL_MS}ms`);
  for (;;) {
    await tick().catch((e) => console.error("tick error", e));
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
