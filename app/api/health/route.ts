import { NextResponse } from "next/server";

const MIN_SESSION = 16;

/** Lightweight readiness check for load balancers / deploy smoke tests. */
export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const sessionSecretConfigured =
    Boolean(process.env.SESSION_SECRET) && process.env.SESSION_SECRET!.length >= MIN_SESSION;
  const ready = databaseConfigured && sessionSecretConfigured;

  return NextResponse.json({
    ok: true,
    service: "web",
    ready,
    checks: {
      databaseUrl: databaseConfigured,
      sessionSecret: sessionSecretConfigured,
    },
  });
}

export const dynamic = "force-dynamic";
