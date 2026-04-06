import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { reports, researchItems, researchJobs, researches, researchSourceRuns } from "@/lib/db/schema";
import {
  resolveGeminiProviderFromUserKey,
  resolveThreadCompressionProvider,
} from "@/lib/ai/thread-compression/select";
import { publishAnglePolishRequestSchema } from "@/lib/publish-angles/polish-schema";
import { runPublishAnglePolishCore } from "@/lib/publish-angles/run-publish-angle-polish-core";

export const dynamic = "force-dynamic";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedReq = publishAnglePolishRequestSchema.safeParse(bodyJson);
  if (!parsedReq.success) {
    return NextResponse.json({ error: "Invalid request body", code: "INVALID_BODY" }, { status: 400 });
  }
  const { opportunityIndex } = parsedReq.data;

  const geminiHeader = request.headers.get("x-gemini-api-key")?.trim() ?? "";
  const fromUserGemini = geminiHeader ? resolveGeminiProviderFromUserKey(geminiHeader) : null;
  const provider = fromUserGemini ?? resolveThreadCompressionProvider();
  if (!provider.ok) {
    return NextResponse.json(
      { error: "AI recap not configured", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  try {
    const userId = await getAnonymousUserIdIfPresent();
    if (!userId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const db = getDb();
    const [job] = await db
      .select({
        id: researchJobs.id,
        userId: researchJobs.userId,
        topic: researchJobs.topic,
        researchId: researchJobs.researchId,
        status: researchJobs.status,
      })
      .from(researchJobs)
      .where(eq(researchJobs.id, id))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!sameUser(job.userId, userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (job.status !== "succeeded") {
      return NextResponse.json(
        { error: "Run is not eligible for AI polish", code: "JOB_NOT_ELIGIBLE" },
        { status: 403 }
      );
    }

    const [report] = await db
      .select({ content: reports.content })
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

    let displayTitle: string | null = null;
    if (job.researchId != null) {
      const [r] = await db
        .select({ displayTitle: researches.displayTitle })
        .from(researches)
        .where(eq(researches.id, job.researchId))
        .limit(1);
      displayTitle = r?.displayTitle ?? null;
    }

    const coreResult = await runPublishAnglePolishCore({
      provider,
      jobTopic: job.topic,
      displayTitle,
      reportMarkdown: report?.content ?? null,
      items: items.map((row) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        snippet: row.snippet,
        score: row.score,
        source: row.source,
      })),
      sourceRuns: runs.map((r) => ({
        source: r.source,
        status: r.status,
        itemCount: r.itemCount,
      })),
      opportunityIndex,
    });

    if (!coreResult.ok) {
      const status =
        coreResult.code === "INVALID_OPPORTUNITY_INDEX" || coreResult.code === "INVALID_ANGLE_CITATIONS"
          ? 400
          : 502;
      return NextResponse.json({ error: coreResult.message, code: coreResult.code }, { status });
    }

    return NextResponse.json(coreResult.payload);
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs/[id]/publish-angles/polish POST]");
  }
}
