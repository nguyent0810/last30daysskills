import { NextResponse } from "next/server";
import { getOrCreateAnonymousUser } from "@/lib/auth/anonymous";

export const dynamic = "force-dynamic";

/** Ensures an anonymous session cookie exists; call from the client on first load. */
export async function GET() {
  const { userId, setCookieHeader } = await getOrCreateAnonymousUser();
  const res = NextResponse.json({ userId });
  if (setCookieHeader) {
    res.headers.append("Set-Cookie", setCookieHeader);
  }
  return res;
}
