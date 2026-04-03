import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { reports, researchItems, researchJobs, researches } from "@/lib/db/schema";
import { toReportModeApi } from "@/lib/report-mode";
import {
  resolveGeminiProviderFromUserKey,
  resolveThreadCompressionProvider,
} from "@/lib/ai/thread-compression/select";
import { runThreadCompression } from "@/lib/ai/thread-compression/run";
import { buildRunRecapContext } from "@/lib/ai/run-recap/build-context";
import { buildRunRecapPrompts } from "@/lib/ai/run-recap/prompt";
import type { RecapLanguage } from "@/lib/ai/run-recap/prompt";
import { isRecapOutputAcceptable } from "@/lib/ai/run-recap/quality";

export const dynamic = "force-dynamic";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let language: RecapLanguage = "en";
  // Body now accepts optional recap language.
  try {
    const body = (await request.json()) as { language?: string };
    if (body?.language === "ja" || body?.language === "vi" || body?.language === "en") {
      language = body.language;
    }
  } catch {
    // Accept empty/missing body; spec sends `{}`.
  }

  const geminiHeader = request.headers.get("x-gemini-api-key")?.trim() ?? "";
  const fromUserGemini = geminiHeader ? resolveGeminiProviderFromUserKey(geminiHeader) : null;
  const provider =
    fromUserGemini ?? resolveThreadCompressionProvider();
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

    const [report] = await db
      .select({
        content: reports.content,
        reportModeStored: reports.reportMode,
      })
      .from(reports)
      .where(eq(reports.jobId, id))
      .limit(1);

    const reportMarkdown = report?.content ?? "";
    const reportReady = reportMarkdown.trim().length > 0;

    if (job.status !== "succeeded" || !reportReady) {
      return NextResponse.json(
        { error: "Run is not eligible for AI recap", code: "JOB_NOT_ELIGIBLE" },
        { status: 403 }
      );
    }

    const [researchRow] =
      job.researchId != null
        ? await db
            .select({ displayTitle: researches.displayTitle })
            .from(researches)
            .where(eq(researches.id, job.researchId))
            .limit(1)
        : [null];
    const displayTitle = researchRow?.displayTitle ?? null;

    const itemRows = await db
      .select({
        source: researchItems.source,
        title: researchItems.title,
        snippet: researchItems.snippet,
      })
      .from(researchItems)
      .where(eq(researchItems.jobId, id))
      .orderBy(desc(researchItems.score))
      .limit(4);

    const contextBlock = buildRunRecapContext({
      topic: job.topic,
      displayTitle,
      jobStatus: job.status,
      reportMode: toReportModeApi(report?.reportModeStored),
      reportMarkdown,
      items: itemRows.map((r) => ({
        source: r.source,
        title: r.title,
        snippet: r.snippet,
      })),
    });

    const { system, user } = buildRunRecapPrompts(job.topic, displayTitle, contextBlock, language);
    const result = await runThreadCompression(system, user, provider);

    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code }, { status: 502 });
    }
    if (!isRecapOutputAcceptable(result.text, language)) {
      return NextResponse.json(
        {
          error: "Recap quality check failed. Please try again.",
          code: "AI_RECAP_BAD_OUTPUT",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ text: result.text });
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs/[id]/ai-recap POST]");
  }
}

