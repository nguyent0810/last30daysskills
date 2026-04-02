import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { researches, researchJobs } from "@/lib/db/schema";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export type CreateResearchRunOk = {
  jobId: string;
  researchId: string;
  status: string;
};

export type CreateResearchRunErr = { kind: "NOT_FOUND" } | { kind: "FORBIDDEN" };

/**
 * Single path for queued runs: new thread (`topic`) or another run under `researchId`.
 */
export async function createResearchRun(
  db: Db,
  args: { userId: string } & ({ topic: string } | { researchId: string })
): Promise<CreateResearchRunOk | CreateResearchRunErr> {
  if ("researchId" in args) {
    const [row] = await db.select().from(researches).where(eq(researches.id, args.researchId)).limit(1);
    if (!row) {
      return { kind: "NOT_FOUND" };
    }
    if (!sameUser(row.userId, args.userId)) {
      return { kind: "FORBIDDEN" };
    }

    const [job] = await db
      .insert(researchJobs)
      .values({
        userId: args.userId,
        researchId: row.id,
        topic: row.topic,
        status: "queued",
      })
      .returning({ id: researchJobs.id, status: researchJobs.status });

    await db
      .update(researches)
      .set({
        updatedAt: new Date(),
        ...(row.archivedAt != null ? { archivedAt: null } : {}),
      })
      .where(eq(researches.id, row.id));

    return { jobId: job.id, researchId: row.id, status: job.status };
  }

  const topic = args.topic.trim();

  return await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(researches)
      .values({ userId: args.userId, topic })
      .returning({ id: researches.id });

    const [job] = await tx
      .insert(researchJobs)
      .values({
        userId: args.userId,
        researchId: r.id,
        topic,
        status: "queued",
      })
      .returning({ id: researchJobs.id, status: researchJobs.status });

    return { jobId: job.id, researchId: r.id, status: job.status };
  });
}
