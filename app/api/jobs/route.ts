import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getDb } from "@/lib/db";
import { reports, researchJobs } from "@/lib/db/schema";
import { toReportModeApi } from "@/lib/report-mode";
import { getOrCreateAnonymousUser } from "@/lib/auth/anonymous";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  topic: z.string().min(1).max(500),
});

export async function POST(request: Request) {
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
    const db = getDb();
    const { userId, setCookieHeader } = await getOrCreateAnonymousUser();

    const [job] = await db
      .insert(researchJobs)
      .values({
        userId,
        topic: parsed.data.topic.trim(),
        status: "queued",
      })
      .returning({ id: researchJobs.id, status: researchJobs.status });

    const res = NextResponse.json({ id: job.id, status: job.status });
    if (setCookieHeader) {
      res.headers.append("Set-Cookie", setCookieHeader);
    }
    return res;
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs POST]");
  }
}

/** Recent jobs for the current anonymous session. */
export async function GET() {
  try {
    const db = getDb();
    const { userId, setCookieHeader } = await getOrCreateAnonymousUser();

    const rows = await db
      .select({
        id: researchJobs.id,
        topic: researchJobs.topic,
        status: researchJobs.status,
        createdAt: researchJobs.createdAt,
        reportModeStored: reports.reportMode,
      })
      .from(researchJobs)
      .leftJoin(reports, eq(reports.jobId, researchJobs.id))
      .where(eq(researchJobs.userId, userId))
      .orderBy(desc(researchJobs.createdAt))
      .limit(50);

    const jobs = rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      status: r.status,
      createdAt: r.createdAt,
      reportMode: toReportModeApi(r.reportModeStored),
    }));

    const res = NextResponse.json({ jobs });
    if (setCookieHeader) {
      res.headers.append("Set-Cookie", setCookieHeader);
    }
    return res;
  } catch (e) {
    return jsonFromRouteError(e, "[api/jobs GET]");
  }
}
