/** Deterministic hero copy for the job page — no LLM. */

import type { ItemText } from "./hero-keywords";
import { formatKeywordPhrase, keywordsFromTopItems } from "./hero-keywords";

export type SourceRunLike = {
  source: string;
  status: string;
  error: string | null;
  itemCount: number;
};

export function computeHeroMetrics(runs: SourceRunLike[]) {
  const totalItems = runs.reduce((s, r) => s + r.itemCount, 0);
  const failed = runs.filter((r) => r.status === "failed").length;
  const succeededWithItems = runs.filter((r) => r.status === "succeeded" && r.itemCount > 0).length;
  const succeededNoItems = runs.filter((r) => r.status === "succeeded" && r.itemCount === 0).length;
  return { totalItems, failed, succeededWithItems, succeededNoItems };
}

/** Short topic phrase */
function topicPhrase(topic: string): string {
  const t = topic.trim();
  if (!t) return "this topic";
  return t.length > 72 ? `${t.slice(0, 69)}…` : t;
}

function kwHint(topItems: ItemText[] | undefined): string {
  if (!topItems?.length) return "";
  const k = keywordsFromTopItems(topItems);
  return formatKeywordPhrase(k);
}

/**
 * Main framing line — concrete, uses 1–2 tokens from top results when available.
 */
export function mainInsightLine(
  topic: string,
  runs: SourceRunLike[],
  topItems?: ItemText[]
): string {
  if (runs.length === 0) {
    return "Waiting for source results…";
  }

  const { totalItems, failed, succeededWithItems, succeededNoItems } = computeHeroMetrics(runs);
  const phrase = topicPhrase(topic);
  const kw = kwHint(topItems);

  if (totalItems === 0) {
    return `Nothing turned up for “${phrase}” this run — try a slightly broader phrasing.`;
  }

  if (failed > 0 && totalItems > 0) {
    if (kw) {
      return `You still get usable links — ${kw} shows up in what we could fetch.`;
    }
    return `Partial fetch, but there’s enough on “${phrase}” to skim.`;
  }

  if (failed === 0 && totalItems >= 10 && succeededWithItems >= 2) {
    if (kw) {
      return `Busy snapshot: ${kw} keeps appearing across ${succeededWithItems} feeds for “${phrase}”.`;
    }
    return `${totalItems} on-topic links across ${succeededWithItems} sources for “${phrase}” — worth a real read-through.`;
  }

  if (failed === 0 && totalItems >= 6) {
    if (kw) {
      return `Clear threads in the results — ${kw} anchors most of what you’ll see.`;
    }
    return `Solid batch for “${phrase}” — ${totalItems} items to scan.`;
  }

  if (succeededNoItems > 0 && succeededWithItems > 0) {
    if (kw) {
      return `One feed was quiet; the other delivered ${kw} and related picks.`;
    }
    return `Uneven pull — one source hit, one didn’t — still enough to review.`;
  }

  if (totalItems > 0 && totalItems < 6) {
    if (kw) {
      return `A small set, but it clusters on ${kw}.`;
    }
    return `Just a handful of matches for “${phrase}” — quick pass.`;
  }

  if (kw) {
    return `Readable mix — ${kw} is the through-line in what came back.`;
  }
  return `There’s enough on “${phrase}” to scan, with a few angles to compare.`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * Factual counts line (second layer).
 */
export function factualInsightLine(runs: SourceRunLike[]): string {
  if (runs.length === 0) {
    return "No source rows yet.";
  }

  const { totalItems, failed, succeededWithItems, succeededNoItems } = computeHeroMetrics(runs);

  const parts: string[] = [];

  parts.push(
    `${totalItems} ${plural(totalItems, "result", "results")} from ${succeededWithItems} ${plural(succeededWithItems, "source", "sources")}`
  );

  if (failed > 0) {
    parts.push(`${failed} ${plural(failed, "source failed", "sources failed")}`);
  } else if (succeededNoItems > 0) {
    parts.push(`${succeededNoItems} ${plural(succeededNoItems, "source had no matches", "sources had no matches")}`);
  }

  return parts.join(". ") + ".";
}

export function runningHeroLines(topic: string): { main: string; factual: string } {
  return {
    main: `Pulling fresh links for “${topicPhrase(topic)}”…`,
    factual: "Sources and report will fill in as each step finishes.",
  };
}

/** Main hero line when `job.status === "failed"` — neutral; details stay in the error + sources. */
export const FAILED_RUN_HERO_MAIN = "This run didn't complete. See details below.";
