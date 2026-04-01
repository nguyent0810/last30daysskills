import type { ResearchItemInput } from "../types";
import { fetchWithContext } from "../http";

/**
 * Reddit expects a unique, descriptive User-Agent with contact context.
 * @see https://github.com/reddit-archive/reddit/wiki/API
 *
 * Cloud/datacenter IPs (Railway, AWS, etc.) often get HTTP 403 "Blocked" from Reddit’s edge
 * even with a valid UA — that is an infrastructure limitation, not something we can fully fix client-side.
 */
const DEFAULT_UA =
  "crm-research/1.0 (topic research snapshot; +https://github.com/; public search.json only)";

function redditUserAgent(): string {
  const custom = process.env.REDDIT_USER_AGENT?.trim();
  if (custom && custom.length >= 12) return custom;
  return DEFAULT_UA;
}

/**
 * Reddit public `.json` search — no OAuth, no scraping.
 */
export async function fetchRedditSearch(topic: string): Promise<ResearchItemInput[]> {
  const disabled = process.env.REDDIT_DISABLED?.trim();
  if (disabled === "1" || /^true$/i.test(disabled ?? "")) {
    throw new Error("Reddit skipped (REDDIT_DISABLED is set on the worker)");
  }

  const q = encodeURIComponent(topic);
  const url = `https://www.reddit.com/search.json?q=${q}&restrict_sr=0&sort=relevance&limit=25`;
  const res = await fetchWithContext(url, {
    headers: {
      "User-Agent": redditUserAgent(),
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    const hint = await res.text().catch(() => "");
    const clip = hint.replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(
      `Reddit search ${res.status}: ${res.statusText}${clip ? ` — ${clip}` : ""}`.trim()
    );
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
