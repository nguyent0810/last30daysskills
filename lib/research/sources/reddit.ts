import type { ResearchItemInput } from "../types";
import { fetchWithContext } from "../http";

const UA = "CRM-Research/1.0 (public JSON only; +https://github.com/)";

/**
 * Reddit public `.json` search — no OAuth, no scraping.
 * Requires a descriptive User-Agent (see https://github.com/reddit-archive/reddit/wiki/API).
 */
export async function fetchRedditSearch(topic: string): Promise<ResearchItemInput[]> {
  const q = encodeURIComponent(topic);
  const url = `https://www.reddit.com/search.json?q=${q}&restrict_sr=0&sort=relevance&limit=25`;
  const res = await fetchWithContext(url, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`Reddit search ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data?: { children?: Array<{ data?: Record<string, unknown> }> };
  };
  const children = json.data?.children ?? [];
  const items: ResearchItemInput[] = [];

  for (const child of children) {
    const d = child.data;
    if (!d || typeof d !== "object") continue;
    const title = String(d.title ?? "").trim();
    if (!title) continue;
    const permalink = String(d.permalink ?? "");
    const link = String(d.url ?? "").trim();
    const selftext = String(d.selftext ?? "").trim();
    const created = d.created_utc;
    let publishedAt: number | undefined;
    if (typeof created === "number") publishedAt = created;

    const urlOut =
      link && !link.includes("reddit.com")
        ? link
        : permalink
          ? `https://www.reddit.com${permalink.startsWith("/") ? permalink : `/${permalink}`}`
          : `https://www.reddit.com`;

    const snippet = selftext.slice(0, 500) || title;

    items.push({
      source: "reddit",
      title: title.slice(0, 500),
      url: urlOut,
      snippet,
      publishedAt,
      raw: d,
    });
  }

  return items;
}
