import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonFromRouteError } from "@/lib/api/route-error-response";
import { getDb } from "@/lib/db";
import { researches } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  vote: z.enum(["up", "down"]),
});

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const token = params.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { vote } = parsed.data;

  try {
    const db = getDb();

    const inc =
      vote === "up"
        ? { shareFeedbackUp: sql`${researches.shareFeedbackUp} + 1` }
        : { shareFeedbackDown: sql`${researches.shareFeedbackDown} + 1` };

    const [updated] = await db
      .update(researches)
      .set({ ...inc, updatedAt: new Date() })
      .where(eq(researches.shareToken, token))
      .returning({
        shareFeedbackUp: researches.shareFeedbackUp,
        shareFeedbackDown: researches.shareFeedbackDown,
      });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      shareFeedbackUp: updated.shareFeedbackUp,
      shareFeedbackDown: updated.shareFeedbackDown,
    });
  } catch (e) {
    return jsonFromRouteError(e, "[api/public/thread/[token]/feedback]");
  }
}
