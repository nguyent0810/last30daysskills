import { sourceStatsFromSourceRunRows } from "@/lib/research/thread-insight";

export type SourceRunLike = {
  source: string;
  status: string;
  itemCount: number;
};

export type JobSignalRailDerived = {
  /** Short headline for the rail. */
  shapeLabel: string;
  /** One observational sentence. */
  coverageNote: string;
  /** Shares of stored items by source (from runs), for micro-bar; sum to ~1 when total>0. */
  shareHn: number;
  shareReddit: number;
  sharePolymarket: number;
  itemTotal: number;
  failedSources: string[];
  emptySources: string[];
};

/**
 * Deterministic signal summary for the left rail — source runs only, observational.
 */
export function deriveJobSignalRail(
  runs: readonly SourceRunLike[],
  jobStatus: string
): JobSignalRailDerived {
  const stats = sourceStatsFromSourceRunRows(runs);
  const total = stats.total;

  const failedSources = runs.filter((r) => r.status === "failed").map((r) => r.source);
  const emptySources = runs
    .filter((r) => r.status === "succeeded" && r.itemCount === 0)
    .map((r) => r.source);

  const shareHn = total > 0 ? stats.hn / total : 0;
  const shareReddit = total > 0 ? stats.reddit / total : 0;
  const sharePolymarket = total > 0 ? stats.polymarket / total : 0;

  const sourcesWithItems = [stats.hn > 0, stats.reddit > 0, stats.polymarket > 0].filter(Boolean).length;

  let shapeLabel = "Signal snapshot";
  if (jobStatus === "queued" || jobStatus === "running") {
    shapeLabel = "Gathering signal";
  } else if (total === 0) {
    shapeLabel = failedSources.length === runs.length ? "No live signal" : "No retrieved items";
  } else if (total < 6) {
    shapeLabel = "Early signal";
  } else if (sourcesWithItems === 1) {
    shapeLabel = "Single-source signal";
  } else if (shareHn >= 0.55) {
    shapeLabel = "Hacker News dominant";
  } else if (shareReddit >= 0.55) {
    shapeLabel = "Reddit-heavy signal";
  } else if (sharePolymarket >= 0.55) {
    shapeLabel = "Polymarket-heavy signal";
  } else if (total >= 12 && sourcesWithItems >= 2) {
    shapeLabel = "Mixed discussion";
  } else {
    shapeLabel = "Cross-source but thin";
  }

  let coverageNote = "Coverage reflects what this run stored from each feed.";
  if (total === 0) {
    coverageNote =
      failedSources.length > 0
        ? "Some feeds did not return items for this wording."
        : "No items were stored yet for this run.";
  } else if (failedSources.length > 0 || emptySources.length > 0) {
    coverageNote = "Some sources returned no useful items for this pass.";
  } else if (sourcesWithItems === 1) {
    coverageNote = "Most evidence came from one source.";
  } else if (total < 10) {
    coverageNote = "Useful, but narrow coverage — another run can widen it.";
  } else if (sourcesWithItems >= 2) {
    coverageNote = "Broader than a single thread, still a snapshot.";
  }

  return {
    shapeLabel,
    coverageNote,
    shareHn,
    shareReddit,
    sharePolymarket,
    itemTotal: total,
    failedSources,
    emptySources,
  };
}

/** Deterministic hue for a subtle topic dot (no images). */
export function topicAccentHue(topic: string): number {
  let h = 0;
  const t = topic.trim();
  for (let i = 0; i < t.length; i++) {
    h = (h * 31 + t.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
