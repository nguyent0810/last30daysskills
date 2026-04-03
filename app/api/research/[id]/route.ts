import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { isThreadCompressionConfigured } from "@/lib/ai/thread-compression/select";
import { parseResearchPatchBody } from "@/lib/research/parse-research-patch-body";
import { loadThreadDetailForResearch } from "@/lib/research/load-thread-detail";

export const dynamic = "force-dynamic";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

function researchJson(research: typeof researches.$inferSelect) {
  return {
    id: research.id,
    topic: research.topic,
    displayTitle: research.displayTitle ?? null,
    archivedAt: research.archivedAt ? research.archivedAt.toISOString() : null,
    isPinned: Boolean(research.isPinned),
    note: research.threadNote ?? null,
    shareToken: research.shareToken ?? null,
    createdAt: research.createdAt.toISOString(),
    updatedAt: research.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
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
    const [research] = await db.select().from(researches).where(eq(researches.id, id)).limit(1);

    if (!research) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!sameUser(research.userId, userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const detail = await loadThreadDetailForResearch(db, id, userId);

    return NextResponse.json({
      research: researchJson(research),
      runs: detail.runs,
      sincePreviousRun: detail.sincePreviousRun,
      threadInsight: detail.threadInsight,
      /** Deploy-time AI compression (HF or Gemini) is configured; eligibility still uses runs + brief length on client. */
      aiSummaryAvailable: isThreadCompressionConfigured(),
    });
  } catch (e) {
    return jsonFromRouteError(e, "[api/research/[id]]");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

  const parsed = parseResearchPatchBody(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { updates } = parsed;

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

    await db
      .update(researches)
      .set({
        updatedAt: new Date(),
        ...(updates.displayTitle !== undefined ? { displayTitle: updates.displayTitle } : {}),
        ...(updates.pinned !== undefined ? { isPinned: updates.pinned } : {}),
        ...(updates.note !== undefined ? { threadNote: updates.note } : {}),
        ...(updates.archived === false ? { archivedAt: null } : {}),
        ...(updates.archived === true && research.archivedAt == null ? { archivedAt: new Date() } : {}),
      })
      .where(eq(researches.id, id));

    const [updated] = await db.select().from(researches).where(eq(researches.id, id)).limit(1);

    return NextResponse.json(researchJson(updated!));
  } catch (e) {
    return jsonFromRouteError(e, "[api/research/[id] PATCH]");
  }
}
