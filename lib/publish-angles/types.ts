/** Public citations: no item UUIDs — UI keys use `url` + index. */
export type PublishAnglesCitation = {
  title: string;
  url: string;
  /** Same codes as stored items: "hn" | "reddit" | "polymarket" (pass-through). */
  source: string;
};

export type PublishAnglesOpportunity = {
  workingTitle: string;
  dek: string;
  whyItMatters: string;
  outline: string[];
  citations: PublishAnglesCitation[];
  confidence: "high" | "medium" | "low";
};

export type PublishAnglesPhase1 = {
  version: 1;
  derivation: "report-led" | "items-led";
  momentumLine: string | null;
  opportunities: PublishAnglesOpportunity[];
};

export type PublishAnglesItemInput = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  source: string;
};

export type PublishAnglesSourceRunInput = {
  source: string;
  status: string;
  itemCount: number;
};
