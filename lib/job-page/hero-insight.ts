/** Deterministic hero copy for the job page — no LLM. */

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

/** Short topic phrase for “Strong signal around …” */
function topicPhrase(topic: string): string {
  const t = topic.trim();
  if (!t) return "this topic";
  return t.length > 72 ? `${t.slice(0, 69)}…` : t;
}

/**
 * Main framing line (product voice).
 */
export function mainInsightLine(topic: string, runs: SourceRunLike[]): string {
  if (runs.length === 0) {
    return "Waiting for source results…";
  }

  const { totalItems, failed, succeededWithItems, succeededNoItems } = computeHeroMetrics(runs);
  const phrase = topicPhrase(topic);

  if (totalItems === 0) {
    return "Low signal for this topic";
  }

  if (failed === 0 && totalItems >= 10 && succeededWithItems >= 2) {
    return `Strong signal around ${phrase}`;
  }

  if (failed === 0 && totalItems >= 6) {
    return `Strong signal around ${phrase}`;
  }

  if (failed > 0 && totalItems > 0) {
    return "Mixed signal with useful technical discussion";
  }

  if (succeededNoItems > 0 && succeededWithItems > 0) {
    return "Mixed signal with useful technical discussion";
  }

  if (totalItems > 0 && totalItems < 6) {
    return "Some signal for this topic";
  }

  return "Mixed signal with useful technical discussion";
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
    main: `Research in progress for ${topicPhrase(topic)}`,
    factual: "Sources and report will appear as the run completes.",
  };
}
