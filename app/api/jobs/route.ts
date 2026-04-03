import { NextResponse } from "next/server";
import { z } from "zod";
import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getOrCreateAnonymousUser } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { reports, researches, researchItems, researchJobs } from "@/lib/db/schema";
import { insightLineFromReport } from "@/lib/job-page/run-insight-line";
import { sincePreviousRunFromUrlLists } from "@/lib/research/new-links-since-previous";
import { createResearchRun } from "@/lib/jobs/create-research-run";
import { toReportModeApi } from "@/lib/report-mode";

export const dynamic = "force-dynamic";

const postBodySchema = z
  .object({
    topic: z.string().max(500).optional(),
    researchId: z.string().uuid().optional(),
  })
  .refine(
    (d) => {
      const hasTopic = d.topic != null && d.topic.trim().length > 0;
      const hasResearch = Boolean(d.researchId);
      return hasTopic !== hasResearch;
    },
    { message: "Send exactly one of: topic (non-empty string) or researchId (uuid)" }
  );

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const db = getDb();
    const { userId, setCookieHeader } = await getOrCreateAnonymousUser();

    const body = parsed.data;
    const result =
      body.researchId != null
        ? await createResearchRun(db, { userId, researchId: body.researchId })
        : await createResearchRun(db, { userId, topic: body.topic!.trim() });

    if ("kind" in result) {
      const res = NextResponse.json({ error: "Not found" }, { status: 404 });
      if (setCookieHeader) {
        res.headers.append("Set-Cookie", setCookieHeader);
      }
      return res;
    }

    const res = NextResponse.json({
      id: result.jobId,
      status: result.status,
      researchId: result.researchId,
    });
    if (setCookieHeader) {
      res.headers.append("Set-Cookie", setCookieHeader);
    }
    return res;
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs POST]");
  }
}

/** Research threads for the session; each row includes the latest run summary. */
export async function GET(request: Request) {
  try {
    const db = getDb();
    const { userId, setCookieHeader } = await getOrCreateAnonymousUser();

    const archivedOnly = new URL(request.url).searchParams.get("archived") === "1";
    const archiveClause = archivedOnly ? isNotNull(researches.archivedAt) : isNull(researches.archivedAt);

    const researchList = await db
      .select()
      .from(researches)
      .where(and(eq(researches.userId, userId), archiveClause))
      .orderBy(desc(researches.isPinned), desc(researches.updatedAt))
      .limit(50);

    if (researchList.length === 0) {
      const empty = NextResponse.json({ researches: [] });
      if (setCookieHeader) {
        empty.headers.append("Set-Cookie", setCookieHeader);
      }
      return empty;
    }

    const researchIds = researchList.map((r) => r.id);

    const runCountRows =
      researchIds.length > 0
        ? await db
            .select({
              researchId: researchJobs.researchId,
              cnt: count(),
            })
            .from(researchJobs)
            .where(and(eq(researchJobs.userId, userId), inArray(researchJobs.researchId, researchIds)))
            .groupBy(researchJobs.researchId)
        : [];
    const runCountByResearch = new Map(
      runCountRows.filter((row) => row.researchId != null).map((row) => [row.researchId as string, Number(row.cnt)])
    );

    const jobRows = await db
      .select({
        id: researchJobs.id,
        researchId: researchJobs.researchId,
        status: researchJobs.status,
        createdAt: researchJobs.createdAt,
        reportModeStored: reports.reportMode,
      })
      .from(researchJobs)
      .leftJoin(reports, eq(reports.jobId, researchJobs.id))
      .where(and(eq(researchJobs.userId, userId), inArray(researchJobs.researchId, researchIds)))
      .orderBy(desc(researchJobs.createdAt));

    const latestByResearch = new Map<
      string,
      {
        id: string;
        status: string;
        createdAt: Date;
        reportModeStored: string | null;
      }
    >();
    for (const row of jobRows) {
      if (!row.researchId) continue;
      if (!latestByResearch.has(row.researchId)) {
        latestByResearch.set(row.researchId, {
          id: row.id,
          status: row.status,
          createdAt: row.createdAt,
          reportModeStored: row.reportModeStored,
        });
      }
    }

    const secondLatestByResearch = new Map<string, { id: string }>();
    for (const row of jobRows) {
      if (!row.researchId) continue;
      const first = latestByResearch.get(row.researchId);
      if (!first || row.id === first.id) continue;
      if (!secondLatestByResearch.has(row.researchId)) {
        secondLatestByResearch.set(row.researchId, { id: row.id });
      }
    }

    const pairJobIds: string[] = [];
    for (const r of researchList) {
      const j1 = latestByResearch.get(r.id);
      const j2 = secondLatestByResearch.get(r.id);
      if (j1 && j2) {
        pairJobIds.push(j1.id, j2.id);
      }
    }

    const itemRowsForPairs =
      pairJobIds.length > 0
        ? await db
            .select({ jobId: researchItems.jobId, url: researchItems.url })
            .from(researchItems)
            .where(inArray(researchItems.jobId, pairJobIds))
        : [];

    const urlsByJobId = new Map<string, string[]>();
    for (const row of itemRowsForPairs) {
      const list = urlsByJobId.get(row.jobId) ?? [];
      list.push(row.url);
      urlsByJobId.set(row.jobId, list);
    }

    const newLinksSincePriorByResearch = new Map<string, number>();
    for (const r of researchList) {
      const j1 = latestByResearch.get(r.id);
      const j2 = secondLatestByResearch.get(r.id);
      if (!j1 || !j2) continue;
      const since = sincePreviousRunFromUrlLists(urlsByJobId.get(j1.id) ?? [], urlsByJobId.get(j2.id) ?? []);
      if (since) newLinksSincePriorByResearch.set(r.id, since.newLinkCount);
    }

    const latestJobIds = [...latestByResearch.values()].map((j) => j.id);
    const reportRows =
      latestJobIds.length > 0
        ? await db
            .select({ jobId: reports.jobId, content: reports.content })
            .from(reports)
            .where(inArray(reports.jobId, latestJobIds))
        : [];
    const insightByJobId = new Map(
      reportRows.map((row) => [row.jobId, insightLineFromReport(row.content)])
    );

    const researchesPayload = researchList.map((r) => {
      const jr = latestByResearch.get(r.id);
      const newLinksSincePriorRun = newLinksSincePriorByResearch.get(r.id) ?? null;
      return {
        id: r.id,
        topic: r.topic,
        displayTitle: r.displayTitle ?? null,
        updatedAt: r.updatedAt,
        isPinned: Boolean(r.isPinned),
        note: r.threadNote ?? null,
        runCount: runCountByResearch.get(r.id) ?? 0,
        newLinksSincePriorRun,
        latestRun: jr
          ? {
              id: jr.id,
              status: jr.status,
              createdAt: jr.createdAt,
              reportMode: toReportModeApi(jr.reportModeStored),
              insightLine: insightByJobId.get(jr.id) ?? null,
            }
          : null,
      };
    });

    const res = NextResponse.json({ researches: researchesPayload });
    if (setCookieHeader) {
      res.headers.append("Set-Cookie", setCookieHeader);
    }
    return res;
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs GET]");
  }
}
