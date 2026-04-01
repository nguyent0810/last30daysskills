import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import {
  buildGeminiUserText,
  callGeminiGenerateSummary,
  type ResearchItemLine,
} from "@/lib/ai/gemini-summary";
import { getDb } from "@/lib/db";
import { reports, researchItems, researchJobs } from "@/lib/db/schema";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  language: z.enum(["en", "vi", "es", "fr", "ja", "de", "zh"]),
  style: z.enum(["short", "bullets", "executive"]),
});

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
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

    if (job.status !== "succeeded") {
      return NextResponse.json(
        { error: "Job must be completed before generating a summary", code: "JOB_NOT_READY" },
        { status: 400 }
      );
    }

    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.jobId, id))
      .limit(1);

    if (!report?.content?.trim()) {
      return NextResponse.json(
        { error: "No report available for this job", code: "NO_REPORT" },
        { status: 400 }
      );
    }

    const rows = await db
      .select({
        source: researchItems.source,
        title: researchItems.title,
        url: researchItems.url,
        snippet: researchItems.snippet,
        score: researchItems.score,
      })
      .from(researchItems)
      .where(eq(researchItems.jobId, id))
      .orderBy(desc(researchItems.score))
      .limit(15);

    const items: ResearchItemLine[] = rows.map((r) => ({
      source: r.source,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      score: r.score,
    }));

    const userText = buildGeminiUserText(
      job.topic,
      report.content,
      items,
      parsed.data.language,
      parsed.data.style
    );

    const result = await callGeminiGenerateSummary(userText);

    if (!result.ok) {
      const status =
        result.code === "GEMINI_NOT_CONFIGURED"
          ? 503
          : result.code === "GEMINI_NETWORK"
            ? 502
            : 502;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status }
      );
    }

    return NextResponse.json({ summary: result.text });
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs/gemini-summary]");
  }
}
