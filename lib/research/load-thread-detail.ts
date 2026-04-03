import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { insightLineFromReport } from "@/lib/job-page/run-insight-line";
import {
  reports,
  researchItems,
  researches,
  researchJobs,
  researchSourceRuns,
} from "@/lib/db/schema";
import { sincePreviousRunFromUrlLists } from "@/lib/research/new-links-since-previous";
import {
  buildThreadInsight,
  deriveVsPreviousLine,
  emptySourceStats,
  sourceStatsFromSourceRunRows,
} from "@/lib/research/thread-insight";
import { toReportModeApi } from "@/lib/report-mode";

export type ThreadInsightPayload = {
  summaryLine: string;
  direction: "rising" | "flat" | "fading" | "sparse";
  sourceDominance: "reddit" | "hacker_news" | "mixed" | "weak";
};

export type ThreadRunPayload = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reportMode: ReturnType<typeof toReportModeApi>;
  insightLine?: string | null;
  vsPreviousLine?: string | null;
};

export type ThreadDetailPayload = {
  runs: ThreadRunPayload[];
  sincePreviousRun: { newLinkCount: number } | null;
  threadInsight: ThreadInsightPayload | null;
};

/**
 * Loads runs, per-run insight lines, thread-level insight, and new-links-since-previous for a research thread.
 * Jobs are scoped by `researchId` and `userId` (owner).
 */
export async function loadThreadDetailForResearch(
  db: Db,
  researchId: string,
  userId: string
): Promise<ThreadDetailPayload> {
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
    .where(and(eq(researchJobs.researchId, researchId), eq(researchJobs.userId, userId)))
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

  const runs: ThreadRunPayload[] = runsBase.map((row, i) => {
    const next = runsBase[i + 1];
    const curStats = statsByJobId.get(row.id) ?? emptySourceStats();
    const vsPreviousLine = next
      ? deriveVsPreviousLine(curStats, statsByJobId.get(next.id) ?? emptySourceStats())
      : null;
    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      reportMode: row.reportMode,
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
    const latestId = runsBase[0]!.id;
    const previousId = runsBase[1]!.id;
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

  return { runs, sincePreviousRun, threadInsight };
}

export async function getResearchByShareToken(db: Db, token: string) {
  const [row] = await db.select().from(researches).where(eq(researches.shareToken, token)).limit(1);
  return row ?? null;
}
