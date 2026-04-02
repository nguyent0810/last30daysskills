import { z } from "zod";

const patchBodySchema = z.object({
  displayTitle: z.union([z.string(), z.null()]),
});

export type ParseDisplayTitlePatchBodyResult =
  | { ok: true; displayTitle: string | null }
  | { ok: false; error: string };

const MAX = 500;

/**
 * Validates PATCH body for research display title.
 * - `null` clears the custom label.
 * - Non-null strings are trimmed; empty/whitespace → invalid.
 */
export function parseDisplayTitlePatchBody(input: unknown): ParseDisplayTitlePatchBodyResult {
  const parsed = patchBodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid body" };
  }

  const { displayTitle } = parsed.data;
  if (displayTitle === null) {
    return { ok: true, displayTitle: null };
  }

  const trimmed = displayTitle.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "displayTitle cannot be empty or whitespace-only" };
  }
  if (trimmed.length > MAX) {
    return { ok: false, error: `displayTitle must be at most ${MAX} characters` };
  }

  return { ok: true, displayTitle: trimmed };
}
