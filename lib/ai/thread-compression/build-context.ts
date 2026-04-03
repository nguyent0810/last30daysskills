import type { ThreadDetailPayload, ThreadInsightPayload, ThreadRunPayload } from "@/lib/research/load-thread-detail";

const MAX_CONTEXT_CHARS = 4000;
const TRUNC_MARKER = "\n[CONTEXT TRUNCATED]";

function dominanceLabel(s: ThreadInsightPayload["sourceDominance"]): string {
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

function directionLabel(d: ThreadInsightPayload["direction"]): string {
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

export type ThreadCompressionSource = {
  topic: string;
  displayTitle: string | null | undefined;
  threadInsight: ThreadInsightPayload | null;
  briefText: string;
  runs: ThreadRunPayload[];
};

/**
 * Composes bounded context for the compression model (spec §4).
 */
export function buildThreadCompressionContext(src: ThreadCompressionSource): string {
  const lines: string[] = [];
  lines.push(`Topic: ${src.topic}`);
  if (src.displayTitle?.trim()) {
    lines.push(`Display title: ${src.displayTitle.trim()}`);
  }

  if (src.threadInsight) {
    lines.push("");
    lines.push("Deterministic thread insight:");
    lines.push(src.threadInsight.summaryLine);
    lines.push(`Direction: ${directionLabel(src.threadInsight.direction)}`);
    lines.push(`Source dominance: ${dominanceLabel(src.threadInsight.sourceDominance)}`);
  }

  lines.push("");
  lines.push("Thread brief:");
  lines.push(src.briefText);

  const recent = src.runs.slice(0, 3);
  if (recent.length > 0) {
    lines.push("");
    lines.push("Recent runs (newest first):");
    for (const run of recent) {
      const parts = [`Status: ${run.status}`, `When: ${run.createdAt}`];
      if (run.insightLine?.trim()) parts.push(`Insight: ${run.insightLine.trim()}`);
      if (run.vsPreviousLine?.trim()) parts.push(`vs prior: ${run.vsPreviousLine.trim()}`);
      lines.push(`- ${parts.join(" · ")}`);
    }
  }

  let out = lines.join("\n");
  if (out.length > MAX_CONTEXT_CHARS) {
    out = out.slice(0, MAX_CONTEXT_CHARS - TRUNC_MARKER.length) + TRUNC_MARKER;
  }
  return out;
}
