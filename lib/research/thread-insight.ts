/**
 * Deterministic thread-level insight from per-run source item counts (research_source_runs).
 * No LLMs — explainable, cheap, stable.
 */

export type ThreadDirection = "rising" | "flat" | "fading" | "sparse";
export type ThreadSourceDominance = "reddit" | "hacker_news" | "mixed" | "weak";

export type SourceItemStats = {
  hn: number;
  reddit: number;
  polymarket: number;
  total: number;
};

export type ThreadInsight = {
  summaryLine: string;
  direction: ThreadDirection;
  sourceDominance: ThreadSourceDominance;
};

const EMPTY: SourceItemStats = { hn: 0, reddit: 0, polymarket: 0, total: 0 };

export function sourceStatsFromSourceRunRows(
  rows: readonly { source: string; itemCount: number | null }[]
): SourceItemStats {
  let hn = 0;
  let reddit = 0;
  let polymarket = 0;
  for (const r of rows) {
    const n = Math.max(0, Number(r.itemCount ?? 0));
    if (r.source === "hn") hn += n;
    else if (r.source === "reddit") reddit += n;
    else if (r.source === "polymarket") polymarket += n;
  }
  const total = hn + reddit + polymarket;
  return { hn, reddit, polymarket, total };
}

export function deriveSourceDominance(stats: SourceItemStats): ThreadSourceDominance {
  const { hn, reddit, polymarket, total } = stats;
  if (total < 4) return "weak";

  const share = (n: number) => n / total;
  const r = share(reddit);
  const h = share(hn);
  const p = share(polymarket);

  if (r >= 0.48 && r >= h && r >= p) return "reddit";
  if (h >= 0.48 && h >= r && h >= p) return "hacker_news";
  if (p >= 0.55 && p > r && p > h) return "mixed";
  return "mixed";
}

export function deriveDirection(
  latest: SourceItemStats,
  previous: SourceItemStats | null,
  runCount: number
): ThreadDirection {
  if (runCount < 1) return "sparse";
  if (latest.total <= 3) return "sparse";
  if (runCount === 1) return "flat";
  if (!previous) return "flat";

  const prev = Math.max(previous.total, 1);
  const ratio = latest.total / prev;
  const delta = latest.total - previous.total;

  if (previous.total >= 5 && ratio <= 0.72 && delta <= -2) return "fading";
  if (ratio >= 1.18 && delta >= 2) return "rising";
  if (Math.abs(delta) <= 1 && ratio >= 0.92 && ratio <= 1.08) return "flat";
  if (delta >= 3) return "rising";
  if (delta <= -3 && previous.total >= 4) return "fading";
  return "flat";
}

function dominancePhrase(d: ThreadSourceDominance): string {
  switch (d) {
    case "reddit":
      return "Reddit-heavy";
    case "hacker_news":
      return "Hacker News–heavy";
    case "weak":
      return "thin signal";
    default:
      return "mixed sources";
  }
}

function directionPhrase(dir: ThreadDirection): string {
  switch (dir) {
    case "rising":
      return "stronger than your last run";
    case "fading":
      return "cooler than your last run";
    case "sparse":
      return "light signal—another run will help";
    case "flat":
    default:
      return "similar in volume to your last run";
  }
}

export function buildThreadInsight(
  latest: SourceItemStats,
  previous: SourceItemStats | null,
  runCount: number
): ThreadInsight {
  const sourceDominance = deriveSourceDominance(latest);
  const direction = deriveDirection(latest, previous, runCount);

  let summaryLine: string;
  if (runCount === 0) {
    summaryLine = "No runs yet—start one to see how sources respond.";
  } else if (runCount === 1) {
    summaryLine =
      sourceDominance === "weak"
        ? "First run returned little material; run again to firm up the picture."
        : `First run leans ${dominancePhrase(sourceDominance)}. Run again to see how the thread moves.`;
  } else if (direction === "sparse" && sourceDominance === "weak") {
    summaryLine =
      "Latest run came back very light across sources—run again when you want a fuller pull.";
  } else {
    summaryLine = `Latest run is ${dominancePhrase(sourceDominance)}; activity looks ${directionPhrase(direction)}.`;
  }

  return { summaryLine, direction, sourceDominance };
}

export function deriveVsPreviousLine(latest: SourceItemStats, previous: SourceItemStats): string {
  const dR = latest.reddit - previous.reddit;
  const dH = latest.hn - previous.hn;
  const dP = latest.polymarket - previous.polymarket;
  const dT = latest.total - previous.total;

  const activeCount = (s: SourceItemStats) =>
    Number(s.hn > 0) + Number(s.reddit > 0) + Number(s.polymarket > 0);

  const parts: string[] = [];

  if (activeCount(latest) > activeCount(previous)) {
    parts.push("Signal broadened across more sources");
  } else if (activeCount(latest) < activeCount(previous) && activeCount(previous) >= 2) {
    parts.push("Fewer sources contributed this time");
  }

  if (dR >= 2 && dR >= dH && dR >= dP) parts.push("More Reddit activity than the previous run");
  if (dH >= 2 && dH >= dR && dH >= dP) parts.push("More Hacker News items than the previous run");
  if (dP >= 2 && dP >= dR && dP >= dH) parts.push("More Polymarket activity than the previous run");

  if (dH <= -2 && previous.hn >= 2) parts.push("Less Hacker News traction than last time");
  if (dR <= -2 && previous.reddit >= 2) parts.push("Less Reddit traction than last time");

  if (parts.length > 0) {
    return parts.slice(0, 2).join(" · ");
  }

  if (Math.abs(dT) <= 1 && activeCount(latest) === activeCount(previous)) {
    return "No major change since the previous run.";
  }
  if (dT >= 3) return "More total items than the previous run.";
  if (dT <= -3) return "Fewer items than the previous run.";
  return "Mix shifted slightly vs the previous run.";
}

export function emptySourceStats(): SourceItemStats {
  return { ...EMPTY };
}
