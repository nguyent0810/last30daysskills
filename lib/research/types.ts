/** Canonical item after fetch + normalize (before dedupe/score). */
export type ResearchItemInput = {
  source: "hn" | "polymarket" | "reddit";
  title: string;
  url: string;
  snippet: string;
  /** Unix seconds when known */
  publishedAt?: number;
  raw?: unknown;
};

export type ScoredItem = ResearchItemInput & {
  score: number;
};
