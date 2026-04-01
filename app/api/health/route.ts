import { NextResponse } from "next/server";

/** Lightweight readiness check for load balancers / deploy smoke tests. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "web" });
}

export const dynamic = "force-dynamic";
