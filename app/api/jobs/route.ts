import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { researchJobs } from "@/lib/db/schema";
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
}

/** Recent jobs for the current anonymous session. */
export async function GET() {
  const db = getDb();
  const { userId, setCookieHeader } = await getOrCreateAnonymousUser();

  const rows = await db
    .select({
      id: researchJobs.id,
      topic: researchJobs.topic,
      status: researchJobs.status,
      createdAt: researchJobs.createdAt,
    })
    .from(researchJobs)
    .where(eq(researchJobs.userId, userId))
    .orderBy(desc(researchJobs.createdAt))
    .limit(50);

  const res = NextResponse.json({ jobs: rows });
  if (setCookieHeader) {
    res.headers.append("Set-Cookie", setCookieHeader);
  }
  return res;
}
