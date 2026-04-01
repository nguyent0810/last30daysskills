import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "crm_session";

/** Minimum length enforced at runtime when signing/verifying. */
const MIN_SECRET_LEN = 16;

export function requireSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < MIN_SECRET_LEN) {
    throw new Error(
      `SESSION_SECRET must be set (min ${MIN_SECRET_LEN} chars). Generate: openssl rand -hex 32`
    );
  }
  return s;
}

/** `uuid.signature` where signature is hex HMAC-SHA256 of the lowercase UUID. */
export function signUserSessionToken(userId: string): string {
  const secret = requireSessionSecret();
  const u = userId.toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u)) {
    throw new Error("Invalid user id for session");
  }
  const sig = createHmac("sha256", secret).update(u).digest("hex");
  return `${u}.${sig}`;
}

export function verifyUserSessionToken(token: string): string | null {
  try {
    const secret = requireSessionSecret();
    if (token.length < 38 || token[36] !== ".") return null;
    const userId = token.slice(0, 36).toLowerCase();
    const sig = token.slice(37);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) return null;
    const expected = createHmac("sha256", secret).update(userId).digest("hex");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return userId;
  } catch {
    return null;
  }
}

/** HttpOnly cookie header value (name=value; attributes). */
export function buildSessionSetCookieHeader(token: string): string {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
