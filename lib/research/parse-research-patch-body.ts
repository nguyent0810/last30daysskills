import { parseDisplayTitlePatchBody } from "./parse-display-title-patch-body";

const ALLOWED_KEYS = ["displayTitle", "archived", "pinned", "note"] as const;

export type ResearchPatchApply = {
  displayTitle?: string | null;
  archived?: boolean;
  pinned?: boolean;
  note?: string | null;
};

export type ParseResearchPatchBodyResult =
  | { ok: true; updates: ResearchPatchApply }
  | { ok: false; error: string };

/**
 * PATCH /api/research/[id] body: any subset of
 * - displayTitle (exclusive with archived, same as before)
 * - archived
 * - pinned
 * - note (string trimmed, max 500; null or "" clears)
 */
export function parseResearchPatchBody(input: unknown): ParseResearchPatchBodyResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Invalid body" };
  }

  const o = input as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) {
    return { ok: false, error: "Invalid body" };
  }

  for (const k of keys) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(k)) {
      return { ok: false, error: "Invalid body" };
    }
  }

  const has = (k: (typeof ALLOWED_KEYS)[number]) => Object.prototype.hasOwnProperty.call(o, k);
  const hasDisplayTitle = has("displayTitle");
  const hasArchived = has("archived");

  if (hasDisplayTitle && hasArchived) {
    return { ok: false, error: "Invalid body: send only one of displayTitle or archived" };
  }

  const updates: ResearchPatchApply = {};

  if (hasDisplayTitle) {
    const title = parseDisplayTitlePatchBody({ displayTitle: o.displayTitle });
    if (!title.ok) {
      return { ok: false, error: title.error };
    }
    updates.displayTitle = title.displayTitle;
  }

  if (hasArchived) {
    if (typeof o.archived !== "boolean") {
      return { ok: false, error: "Invalid body" };
    }
    updates.archived = o.archived;
  }

  if (has("pinned")) {
    if (typeof o.pinned !== "boolean") {
      return { ok: false, error: "Invalid body" };
    }
    updates.pinned = o.pinned;
  }

  if (has("note")) {
    if (o.note !== null && typeof o.note !== "string") {
      return { ok: false, error: "Invalid body" };
    }
    if (o.note === null) {
      updates.note = null;
    } else {
      const t = o.note.trim();
      if (t.length > 500) {
        return { ok: false, error: "note must be at most 500 characters" };
      }
      updates.note = t.length === 0 ? null : t;
    }
  }

  return { ok: true, updates };
}
