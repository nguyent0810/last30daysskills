import type { ResearchItemInput } from "../types";
import { fetchWithContext } from "../http";

const HN_SEARCH = "https://hn.algolia.com/api/v1/search";

export async function fetchHackerNews(topic: string): Promise<ResearchItemInput[]> {
  const url = `${HN_SEARCH}?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=30`;
  const res = await fetchWithContext(url);
  if (!res.ok) {
    throw new Error(`HN API ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as {
    hits?: Array<{
      title?: string;
      url?: string;
      story_text?: string;
      created_at_i?: number;
      objectID?: string;
    }>;
  };
  const hits = data.hits ?? [];
  const items: ResearchItemInput[] = [];
  for (const h of hits) {
    const title = (h.title ?? "").trim();
    const link = (h.url ?? "").trim();
    const hnUrl = `https://news.ycombinator.com/item?id=${h.objectID ?? ""}`;
    const urlOut = link || hnUrl;
    if (!title) continue;
    items.push({
      source: "hn",
      title,
      url: urlOut,
      snippet: (h.story_text ?? "").slice(0, 500) || title,
      publishedAt: h.created_at_i,
      raw: h,
    });
  }
  return items;
}
