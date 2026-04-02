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
