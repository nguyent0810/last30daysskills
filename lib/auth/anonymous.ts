/**
 * Phase 1B: signed HTTP-only cookie + anon user row.
 * Phase 1A: all requests use the internal user from `ensureInternalUserId`.
 */
import type { Db } from "@/lib/db";
import { ensureInternalUserId } from "@/lib/auth/internal-user";

export async function getUserIdForRequest(_db: Db): Promise<string> {
  return ensureInternalUserId(_db);
}
