import type { ResearchItemInput } from "./types";
import type { ScoredItem } from "./types";

const MAX_AGE_SEC = 30 * 24 * 60 * 60;

/**
 * Deterministic score: keyword overlap with topic + mild recency bonus (HN).
 * topic: user string; items already normalized.
 */
export function scoreItems(topic: string, items: ResearchItemInput[]): ScoredItem[] {
  const topicTokens = tokenize(topic);
  return items.map((item) => ({
    ...item,
    score: computeScore(topicTokens, item),
  }));
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length >= 2)
  );
}

function computeScore(topicTokens: Set<string>, item: ResearchItemInput): number {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  let overlap = 0;
  for (const t of topicTokens) {
    if (text.includes(t)) overlap += 1;
  }
  const base = topicTokens.size > 0 ? overlap / topicTokens.size : 0.5;

  let recency = 0;
  if (item.publishedAt != null) {
    const age = Math.max(0, Date.now() / 1000 - item.publishedAt);
    recency = Math.max(0, 1 - age / MAX_AGE_SEC) * 0.15;
  }

  return Math.min(1, base * 0.85 + recency + (item.source === "hn" ? 0.02 : 0));
}

export function sortByScoreDesc(items: ScoredItem[]): ScoredItem[] {
  return [...items].sort((a, b) => b.score - a.score);
}
