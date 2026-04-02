import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getDb } from "@/lib/db";
import { reports, researchItems, researches, researchJobs, researchSourceRuns } from "@/lib/db/schema";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { resolveJobDetailThread } from "@/lib/jobs/job-detail-thread";
import { toReportModeApi } from "@/lib/report-mode";

export const dynamic = "force-dynamic";

function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const userId = await getAnonymousUserIdIfPresent();
    if (!userId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
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

    if (!sameUser(job.userId, userId)) {
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

    const items = await db
      .select({
        id: researchItems.id,
        title: researchItems.title,
        url: researchItems.url,
        snippet: researchItems.snippet,
        score: researchItems.score,
        source: researchItems.source,
      })
      .from(researchItems)
      .where(eq(researchItems.jobId, id))
      .orderBy(desc(researchItems.score))
      .limit(25);

    let researchRow: {
      id: string;
      topic: string;
      displayTitle: string | null;
      userId: string;
    } | null = null;
    if (job.researchId != null) {
      const [r] = await db
        .select({
          id: researches.id,
          topic: researches.topic,
          displayTitle: researches.displayTitle,
          userId: researches.userId,
        })
        .from(researches)
        .where(eq(researches.id, job.researchId))
        .limit(1);
      researchRow = r
        ? {
            id: r.id,
            topic: r.topic,
            displayTitle: r.displayTitle ?? null,
            userId: r.userId,
          }
        : null;
    }

    const thread = resolveJobDetailThread(job.researchId ?? null, researchRow, userId);

    return NextResponse.json({
      job: {
        id: job.id,
        researchId: job.researchId ?? null,
        topic: job.topic,
        status: job.status,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      thread,
      report: report?.content ?? null,
      reportMode: toReportModeApi(report?.reportMode),
      sourceRuns: runs,
      items,
      geminiAvailable: geminiConfigured(),
    });
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs/[id]]");
  }
}
