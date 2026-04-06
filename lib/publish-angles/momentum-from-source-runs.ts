import type { PublishAnglesSourceRunInput } from "./types";

function sourceLabel(source: string): string {
  if (source === "hn") return "Hacker News";
  if (source === "reddit") return "Reddit";
  if (source === "polymarket") return "Polymarket";
  return source;
}

/**
 * Factual item counts per source for this run only — no predictions or editorial framing.
 */
export function buildMomentumObservation(
  sourceRuns: readonly PublishAnglesSourceRunInput[]
): string | null {
  const succeeded = sourceRuns.filter((r) => r.status === "succeeded");
  if (succeeded.length === 0) return null;

  const total = succeeded.reduce((s, r) => s + Math.max(0, r.itemCount), 0);
  if (total === 0) return null;

  const parts = [...succeeded]
    .sort((a, b) => a.source.localeCompare(b.source))
    .map((r) => `${sourceLabel(r.source)}: ${r.itemCount} items`);

  return `Items stored this run — ${parts.join("; ")}.`;
}
