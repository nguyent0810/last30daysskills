import { NextResponse } from "next/server";

/**
 * Maps known server misconfiguration / DB connectivity errors to JSON responses
 * (no secrets leaked). Logs full error server-side.
 */
export function jsonFromRouteError(e: unknown, logPrefix: string): NextResponse {
  console.error(logPrefix, e);

  if (!(e instanceof Error)) {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const msg = e.message;

  if (msg.includes("DATABASE_URL is not set")) {
    return NextResponse.json(
      { error: "configuration", code: "MISSING_DATABASE_URL" },
      { status: 503 }
    );
  }

  if (msg.includes("SESSION_SECRET")) {
    return NextResponse.json(
      { error: "configuration", code: "MISSING_SESSION_SECRET" },
      { status: 503 }
    );
  }

  if (
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|password authentication failed|no pg_hba|connection.*refused|Connection terminated|timeout exceeded|SSL|TLS/i.test(
      msg
    )
  ) {
    return NextResponse.json(
      { error: "database_unavailable", code: "DATABASE_UNAVAILABLE" },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: "internal" }, { status: 500 });
}
