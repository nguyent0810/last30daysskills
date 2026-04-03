import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { buildThreadCompressionContext } from "@/lib/ai/thread-compression/build-context";
import { buildCompressionPrompts } from "@/lib/ai/thread-compression/prompt";
import { isThreadAiCompressionEligible } from "@/lib/ai/thread-compression/eligibility";
import { resolveThreadCompressionProvider } from "@/lib/ai/thread-compression/select";
import { runThreadCompression } from "@/lib/ai/thread-compression/run";
import { buildThreadBriefText } from "@/lib/research/format-thread-brief";
import { loadThreadDetailForResearch } from "@/lib/research/load-thread-detail";

export const dynamic = "force-dynamic";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const provider = resolveThreadCompressionProvider();
  if (!provider.ok) {
    return NextResponse.json(
      { error: "AI summary not configured", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  try {
    const userId = await getAnonymousUserIdIfPresent();
    if (!userId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const db = getDb();
    const [research] = await db.select().from(researches).where(eq(researches.id, id)).limit(1);

    if (!research) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!sameUser(research.userId, userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const detail = await loadThreadDetailForResearch(db, id, userId);
    const briefText = buildThreadBriefText({
      displayTitle: research.displayTitle,
      topic: research.topic,
      note: research.threadNote,
      threadInsight: detail.threadInsight,
      runs: detail.runs,
    });

    if (!isThreadAiCompressionEligible(detail.runs.length, briefText.length)) {
      return NextResponse.json(
        { error: "Thread is not eligible for AI compression", code: "AI_SUMMARY_NOT_ELIGIBLE" },
        { status: 403 }
      );
    }

    const contextBlock = buildThreadCompressionContext({
      topic: research.topic,
      displayTitle: research.displayTitle,
      threadInsight: detail.threadInsight,
      briefText,
      runs: detail.runs,
    });

    const { system, user } = buildCompressionPrompts(research.topic, research.displayTitle, contextBlock);
    const result = await runThreadCompression(system, user, provider);

    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code }, { status: 502 });
    }

    return NextResponse.json({ text: result.text });
  } catch (e) {
    return jsonFromRouteError(e, "[api/research/[id]/ai-summary]");
  }
}
