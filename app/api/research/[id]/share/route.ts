import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getAnonymousUserIdIfPresent } from "@/lib/auth/anonymous";
import { getDb } from "@/lib/db";
import { researches } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

function mintShareToken(): string {
  return randomBytes(18).toString("base64url");
}

/**
 * Ensures a share token exists for the thread and returns the public path.
 * Idempotent when a token already exists.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
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

    if (research.shareToken) {
      return NextResponse.json({ path: `/t/${research.shareToken}`, shareToken: research.shareToken });
    }

    const token = mintShareToken();
    await db
      .update(researches)
      .set({ shareToken: token, updatedAt: new Date() })
      .where(eq(researches.id, id));

    return NextResponse.json({ path: `/t/${token}`, shareToken: token });
  } catch (e) {
    return jsonFromRouteError(e, "[api/research/[id]/share POST]");
  }
}
