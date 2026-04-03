import { NextResponse } from "next/server";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getDb } from "@/lib/db";
import { buildThreadBriefText } from "@/lib/research/format-thread-brief";
import { getResearchByShareToken, loadThreadDetailForResearch } from "@/lib/research/load-thread-detail";

export const dynamic = "force-dynamic";

const PUBLIC_RUNS_CAP = 8;

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const token = params.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const db = getDb();
    const research = await getResearchByShareToken(db, token);
    if (!research) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const detail = await loadThreadDetailForResearch(db, research.id, research.userId);

    const title = research.displayTitle?.trim() || research.topic;
    const briefText = buildThreadBriefText({
      displayTitle: research.displayTitle,
      topic: research.topic,
      note: null,
      threadInsight: detail.threadInsight,
      runs: detail.runs.map((r) => ({ vsPreviousLine: r.vsPreviousLine })),
    });

    const runsPublic = detail.runs.slice(0, PUBLIC_RUNS_CAP).map((r) => ({
      status: r.status,
      createdAt: r.createdAt,
      reportMode: r.reportMode,
      insightLine: r.insightLine ?? null,
      vsPreviousLine: r.vsPreviousLine ?? null,
    }));

    return NextResponse.json({
      title,
      topic: research.topic,
      threadInsight: detail.threadInsight,
      sincePreviousRun: detail.sincePreviousRun,
      runs: runsPublic,
      briefText,
      shareFeedbackUp: research.shareFeedbackUp,
      shareFeedbackDown: research.shareFeedbackDown,
    });
  } catch (e) {
    return jsonFromRouteError(e, "[api/public/thread/[token]]");
  }
}
