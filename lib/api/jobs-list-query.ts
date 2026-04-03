/**
 * Shared query parsing for `GET /api/jobs` (thread list for History, Home strip, etc.).
 */

/** Max rows returned by `GET /api/jobs` when `limit` is omitted or invalid. */
export const RESEARCH_LIST_LIMIT_MAX = 50;

/** Home “Recent threads” strip: sort by `researches.updatedAt` only (no pin boost). */
export const RESEARCH_LIST_VIEW_RECENT = "recent";

/**
 * Optional `?limit=` on GET; omitted = {@link RESEARCH_LIST_LIMIT_MAX}.
 * Invalid (NaN) → max. Clamped to [1, RESEARCH_LIST_LIMIT_MAX].
 */
export function resolveResearchListLimit(searchParams: URLSearchParams): number {
  const raw = searchParams.get("limit");
  if (raw === null || raw === "") return RESEARCH_LIST_LIMIT_MAX;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return RESEARCH_LIST_LIMIT_MAX;
  return Math.min(RESEARCH_LIST_LIMIT_MAX, Math.max(1, n));
}

/** When `view=recent`, list is ordered by true recency only (see route handler). */
export function isResearchListViewRecent(searchParams: URLSearchParams): boolean {
  return searchParams.get("view") === RESEARCH_LIST_VIEW_RECENT;
}
