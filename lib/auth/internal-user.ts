import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Phase 1A: one shared "internal" user row so jobs always have a valid FK.
 * Phase 1B: add anonymous cookie users (`kind: 'anonymous'`) and prefer that id from the session.
 */
export async function ensureInternalUserId(db: Db): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.kind, "internal"))
    .limit(1);
  if (existing[0]) {
    return existing[0].id;
  }
  const [inserted] = await db
    .insert(users)
    .values({ kind: "internal" })
    .returning({ id: users.id });
  return inserted.id;
}
