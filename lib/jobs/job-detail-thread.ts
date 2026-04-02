function sameUser(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

export type JobDetailThreadPayload = {
  id: string;
  topic: string;
  displayTitle: string | null;
};

/**
 * Builds `thread` for GET /api/jobs/[id]: populated only when the job links to
 * a research row owned by the session user.
 */
export function resolveJobDetailThread(
  researchId: string | null,
  researchRow:
    | { id: string; topic: string; displayTitle: string | null; userId: string }
    | null
    | undefined,
  sessionUserId: string
): JobDetailThreadPayload | null {
  if (researchId == null) return null;
  if (researchRow == null) return null;
  if (!sameUser(researchRow.userId, sessionUserId)) return null;
  return {
    id: researchRow.id,
    topic: researchRow.topic,
    displayTitle: researchRow.displayTitle ?? null,
  };
}

export function threadOrientationLabel(thread: JobDetailThreadPayload): string {
  return thread.displayTitle?.trim() || thread.topic;
}

/** Run page: link + label, or null when no thread context. */
export function threadOrientationForUi(thread: JobDetailThreadPayload | null): {
  href: string;
  label: string;
} | null {
  if (thread == null) return null;
  return {
    href: `/research/${thread.id}`,
    label: threadOrientationLabel(thread),
  };
}
