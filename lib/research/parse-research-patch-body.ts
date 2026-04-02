import { parseDisplayTitlePatchBody } from "./parse-display-title-patch-body";

export type ResearchPatchOp =
  | { kind: "displayTitle"; displayTitle: string | null }
  | { kind: "archive"; archived: boolean };

export type ParseResearchPatchBodyResult =
  | { ok: true; op: ResearchPatchOp }
  | { ok: false; error: string };

/**
 * One operation per request: either `displayTitle` or `archived`, never both.
 */
export function parseResearchPatchBody(input: unknown): ParseResearchPatchBodyResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Invalid body" };
  }

  const o = input as Record<string, unknown>;
  const hasArchived = Object.prototype.hasOwnProperty.call(o, "archived");
  const hasDisplayTitle = Object.prototype.hasOwnProperty.call(o, "displayTitle");

  if (hasArchived && hasDisplayTitle) {
    return { ok: false, error: "Invalid body: send only one of displayTitle or archived" };
  }
  if (!hasArchived && !hasDisplayTitle) {
    return { ok: false, error: "Invalid body" };
  }

  if (hasArchived) {
    if (typeof o.archived !== "boolean") {
      return { ok: false, error: "Invalid body" };
    }
    return { ok: true, op: { kind: "archive", archived: o.archived } };
  }

  const title = parseDisplayTitlePatchBody(input);
  if (!title.ok) {
    return title;
  }
  return { ok: true, op: { kind: "displayTitle", displayTitle: title.displayTitle } };
}
