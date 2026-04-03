import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getDb } from "@/lib/db";
import { researches } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Explicit public view signal (client fires after page load).
 * Keeps GET /api/public/thread/[token] read-only and avoids counting prefetch/API-only traffic.
 */
export async function POST(_request: Request, { params }: { params: { token: string } }) {
  const token = params.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const db = getDb();
    const now = new Date();
    const [updated] = await db
      .update(researches)
      .set({
        publicViewCount: sql`${researches.publicViewCount} + 1`,
        lastPublicViewAt: now,
        updatedAt: now,
      })
      .where(eq(researches.shareToken, token))
      .returning({
        publicViewCount: researches.publicViewCount,
      });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true as const });
  } catch (e) {
    return jsonFromRouteError(e, "[api/public/thread/[token]/view]");
  }
}
