import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { insightLineFromReport } from "@/lib/job-page/run-insight-line";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { reports, researchItems, researches, researchJobs, researchSourceRuns } from "@/lib/db/schema";
import { parseResearchPatchBody } from "@/lib/research/parse-research-patch-body";
import { sincePreviousRunFromUrlLists } from "@/lib/research/new-links-since-previous";
import {
  buildThreadInsight,
  deriveVsPreviousLine,
  emptySourceStats,
  sourceStatsFromSourceRunRows,
} from "@/lib/research/thread-insight";
import { toReportModeApi } from "@/lib/report-mode";

export const dynamic = "force-dynamic";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
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

    const runRows = await db
      .select({
        id: researchJobs.id,
        status: researchJobs.status,
        createdAt: researchJobs.createdAt,
        updatedAt: researchJobs.updatedAt,
        reportModeStored: reports.reportMode,
      })
      .from(researchJobs)
      .leftJoin(reports, eq(reports.jobId, researchJobs.id))
      .where(and(eq(researchJobs.researchId, id), eq(researchJobs.userId, userId)))
      .orderBy(desc(researchJobs.createdAt));

    const runsBase = runRows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      reportMode: toReportModeApi(row.reportModeStored),
    }));

    const runIds = runsBase.map((r) => r.id);
    const reportLines =
      runIds.length > 0
        ? await db
            .select({ jobId: reports.jobId, content: reports.content })
            .from(reports)
            .where(inArray(reports.jobId, runIds))
        : [];
    const insightByJobId = new Map(
      reportLines.map((row) => [row.jobId, insightLineFromReport(row.content)])
    );

    const sourceRows =
      runIds.length > 0
        ? await db
            .select({
              jobId: researchSourceRuns.jobId,
              source: researchSourceRuns.source,
              itemCount: researchSourceRuns.itemCount,
            })
            .from(researchSourceRuns)
            .where(inArray(researchSourceRuns.jobId, runIds))
        : [];

    const statsByJobId = new Map<string, ReturnType<typeof emptySourceStats>>();
    for (const jid of runIds) statsByJobId.set(jid, emptySourceStats());
    const rowsByJob = new Map<string, { source: string; itemCount: number | null }[]>();
    for (const row of sourceRows) {
      const list = rowsByJob.get(row.jobId) ?? [];
      list.push(row);
      rowsByJob.set(row.jobId, list);
    }
    for (const jid of runIds) {
      statsByJobId.set(jid, sourceStatsFromSourceRunRows(rowsByJob.get(jid) ?? []));
    }

    const runs = runsBase.map((row, i) => {
      const next = runsBase[i + 1];
      const curStats = statsByJobId.get(row.id) ?? emptySourceStats();
      const vsPreviousLine = next
        ? deriveVsPreviousLine(curStats, statsByJobId.get(next.id) ?? emptySourceStats())
        : null;
      return {
        ...row,
        insightLine: insightByJobId.get(row.id) ?? null,
        vsPreviousLine,
      };
    });

    const threadInsight =
      runsBase.length === 0
        ? null
        : buildThreadInsight(
            statsByJobId.get(runsBase[0]!.id) ?? emptySourceStats(),
            runsBase[1] ? statsByJobId.get(runsBase[1]!.id) ?? emptySourceStats() : null,
            runsBase.length
          );

    let sincePreviousRun: { newLinkCount: number } | null = null;
    if (runs.length >= 2) {
      const latestId = runs[0]!.id;
      const previousId = runs[1]!.id;
      const itemRows = await db
        .select({ jobId: researchItems.jobId, url: researchItems.url })
        .from(researchItems)
        .where(inArray(researchItems.jobId, [latestId, previousId]));

      const latestUrls: string[] = [];
      const previousUrls: string[] = [];
      for (const row of itemRows) {
        if (row.jobId === latestId) latestUrls.push(row.url);
        else if (row.jobId === previousId) previousUrls.push(row.url);
      }

      sincePreviousRun = sincePreviousRunFromUrlLists(latestUrls, previousUrls);
    }

    return NextResponse.json({
      research: {
        id: research.id,
        topic: research.topic,
        displayTitle: research.displayTitle ?? null,
        archivedAt: research.archivedAt ? research.archivedAt.toISOString() : null,
        createdAt: research.createdAt,
        updatedAt: research.updatedAt,
      },
      runs,
      sincePreviousRun,
      threadInsight,
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

    if (parsed.op.kind === "displayTitle") {
      await db
        .update(researches)
        .set({ displayTitle: parsed.op.displayTitle })
        .where(eq(researches.id, id));
    } else if (parsed.op.archived) {
      await db
        .update(researches)
        .set({ archivedAt: new Date() })
        .where(and(eq(researches.id, id), isNull(researches.archivedAt)));
    } else {
      await db.update(researches).set({ archivedAt: null }).where(eq(researches.id, id));
    }

    const [updated] = await db.select().from(researches).where(eq(researches.id, id)).limit(1);

    if (parsed.op.kind === "displayTitle") {
      return NextResponse.json({
        id: updated!.id,
        topic: updated!.topic,
        displayTitle: updated!.displayTitle ?? null,
      });
    }

    return NextResponse.json({
      id: updated!.id,
      archivedAt: updated!.archivedAt ? updated!.archivedAt.toISOString() : null,
    });
  } catch (e) {
    return jsonFromRouteError(e, "[api/research/[id] PATCH]");
  }
}
