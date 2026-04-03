import { RESEARCH_LIST_VIEW_RECENT } from "@/lib/api/jobs-list-query";

/** Only `archived=1` selects archived mode (API + History URL). */
export const HISTORY_ARCHIVED_QUERY = "archived=1" as const;

/**
 * Query-param mode for /history: default = active threads only; archived = ?archived=1.
 */
export function isHistoryArchivedView(searchParams: Pick<URLSearchParams, "get">): boolean {
  return searchParams.get("archived") === "1";
}

/** Next.js path for the archived History view (use for all in-app links). */
export function historyArchivedListPath(): string {
  return `/history?${HISTORY_ARCHIVED_QUERY}`;
}

export function historyJobsListUrl(archivedMode: boolean): string {
  return archivedMode ? `/api/jobs?${HISTORY_ARCHIVED_QUERY}` : "/api/jobs";
}

/** Active threads only, capped for Home “recent” strip (must match `GET /api/jobs` clamp). */
export const HOME_RECENT_JOBS_LIMIT = 5;

/** Same as `RESEARCH_LIST_VIEW_RECENT` — Home strip uses `view` for true recency (no pin boost). */
export const HOME_JOBS_VIEW_RECENT = RESEARCH_LIST_VIEW_RECENT;

/** Home strip: true recency order + limit (see `lib/api/jobs-list-query`). */
export function homeRecentJobsListUrl(): string {
  return `/api/jobs?limit=${HOME_RECENT_JOBS_LIMIT}&view=${RESEARCH_LIST_VIEW_RECENT}`;
}
