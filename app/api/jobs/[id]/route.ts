import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reports, researchJobs, researchSourceRuns } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getDb();
  const [job] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, id))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.jobId, id))
    .limit(1);

  const runs = await db
    .select()
    .from(researchSourceRuns)
    .where(eq(researchSourceRuns.jobId, id));

  return NextResponse.json({
    job: {
      id: job.id,
      topic: job.topic,
      status: job.status,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
    report: report?.content ?? null,
    sourceRuns: runs,
  });
}
