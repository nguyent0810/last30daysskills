import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { researchJobs } from "@/lib/db/schema";
import { getUserIdForRequest } from "@/lib/auth/anonymous";

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
  const userId = await getUserIdForRequest(db);

  const [job] = await db
    .insert(researchJobs)
    .values({
      userId,
      topic: parsed.data.topic.trim(),
      status: "queued",
    })
    .returning({ id: researchJobs.id, status: researchJobs.status });

  return NextResponse.json({ id: job.id, status: job.status });
}
