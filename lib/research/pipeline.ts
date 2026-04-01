import type { ResearchItemInput } from "./types";
import { normalizeItem } from "./normalize";
import { dedupeByUrl } from "./dedupe";
import { scoreItems, sortByScoreDesc } from "./score";
import { fetchHackerNews } from "./sources/hacker-news";
import { fetchPolymarket } from "./sources/polymarket";
import { buildDeterministicReport } from "./report";
import type { ScoredItem } from "./types";

export type PipelineResult = {
  items: ScoredItem[];
  report: string;
  hn: { itemCount: number; error?: string };
  polymarket: { itemCount: number; error?: string };
};

export async function runFetchAndRank(topic: string): Promise<PipelineResult> {
  let hnItems: ResearchItemInput[] = [];
  let hnError: string | undefined;
  try {
    hnItems = await fetchHackerNews(topic);
  } catch (e) {
    hnError = e instanceof Error ? e.message : String(e);
  }

  let pmItems: ResearchItemInput[] = [];
  let pmError: string | undefined;
  try {
    pmItems = await fetchPolymarket(topic);
  } catch (e) {
    pmError = e instanceof Error ? e.message : String(e);
  }

  const raw = [...hnItems, ...pmItems].map((i) => normalizeItem(i));
  const deduped = dedupeByUrl(raw);
  const scored = scoreItems(topic, deduped);
  const sorted = sortByScoreDesc(scored);
  const report = buildDeterministicReport(topic, sorted);

  return {
    items: sorted,
    report,
    hn: { itemCount: hnItems.length, error: hnError },
    polymarket: { itemCount: pmItems.length, error: pmError },
  };
}
