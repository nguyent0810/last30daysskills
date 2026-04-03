/**
 * Deterministic thread brief for copy/paste (Phase 4). No API, no stored blobs.
 */

export type ThreadBriefInsight = {
  summaryLine: string;
  direction: "rising" | "flat" | "fading" | "sparse";
  sourceDominance: "reddit" | "hacker_news" | "mixed" | "weak";
};

export type ThreadBriefRunSlice = {
  vsPreviousLine?: string | null;
};

export type ThreadBriefInput = {
  displayTitle: string | null | undefined;
  topic: string;
  note: string | null | undefined;
  threadInsight: ThreadBriefInsight | null;
  runs: ThreadBriefRunSlice[];
};

function directionLabel(d: ThreadBriefInsight["direction"]): string {
  switch (d) {
    case "rising":
      return "Rising";
    case "fading":
      return "Fading";
    case "sparse":
      return "Sparse";
    default:
      return "Flat";
  }
}

function dominanceLabel(s: ThreadBriefInsight["sourceDominance"]): string {
  switch (s) {
    case "reddit":
      return "Reddit-heavy";
    case "hacker_news":
      return "Hacker News–heavy";
    case "weak":
      return "Weak signal";
    default:
      return "Mixed";
  }
}

/**
 * First non-empty `vsPreviousLine` when scanning **newest → oldest**
 * (`runs[0]` must be the latest run, matching `GET /api/research/[id]`).
 */
export function pickWhatChangedLine(runs: readonly ThreadBriefRunSlice[]): string | null {
  for (const run of runs) {
    const v = run.vsPreviousLine?.trim();
    if (v) return v;
  }
  return null;
}

export function buildThreadBriefText(input: ThreadBriefInput): string {
  const title = input.displayTitle?.trim() || input.topic;
  const topic = input.topic;

  const signal = input.threadInsight?.summaryLine ?? "No signal yet";
  const direction = input.threadInsight
    ? directionLabel(input.threadInsight.direction)
    : "Not enough data yet";
  const dominance = input.threadInsight
    ? dominanceLabel(input.threadInsight.sourceDominance)
    : "Not enough data yet";

  const delta = pickWhatChangedLine(input.runs);
  const whatChanged = delta ?? "No previous run to compare";

  const lines: string[] = [
    `Title: ${title}`,
    `Topic: ${topic}`,
    `Current signal: ${signal}`,
    `Direction: ${direction}`,
    `Source dominance: ${dominance}`,
    `What changed: ${whatChanged}`,
  ];

  const note = input.note?.trim();
  if (note) {
    lines.push("");
    lines.push("Why this matters:");
    lines.push(note);
  }

  return lines.join("\n");
}
