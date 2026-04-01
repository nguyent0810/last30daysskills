import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  SESSION_COOKIE_NAME,
  verifyUserSessionToken,
  signUserSessionToken,
  buildSessionSetCookieHeader,
} from "@/lib/auth/session";

/**
 * Resolve the current browser session to a `users` row (`kind: anonymous`).
 * Creates a new anonymous user and returns `Set-Cookie` when no valid cookie exists.
 */
export async function getOrCreateAnonymousUser(): Promise<{
  userId: string;
  setCookieHeader: string | null;
}> {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
    const userId = verifyUserSessionToken(decoded);
    if (userId) {
      const db = getDb();
      const row = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (row[0]) {
        return { userId: row[0].id, setCookieHeader: null };
      }
    }
  }

  const db = getDb();
  const [inserted] = await db
    .insert(users)
    .values({ kind: "anonymous" })
    .returning({ id: users.id });
  const token = signUserSessionToken(inserted.id);
  return { userId: inserted.id, setCookieHeader: buildSessionSetCookieHeader(token) };
}

/** Read session only (no create). Returns null if missing/invalid. */
export async function getAnonymousUserIdIfPresent(): Promise<string | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
  const userId = verifyUserSessionToken(decoded);
  if (!userId) return null;
  const db = getDb();
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row[0]?.id ?? null;
}
