import type { ResearchItemInput } from "../types";
import { fetchWithContext } from "../http";

const GAMMA_MARKETS = "https://gamma-api.polymarket.com/markets";

/**
 * Fetch active markets and filter by simple keyword overlap with topic.
 * No search endpoint — deterministic client-side filter (MVP).
 */
export async function fetchPolymarket(topic: string): Promise<ResearchItemInput[]> {
  const res = await fetchWithContext(`${GAMMA_MARKETS}?limit=150&active=true`);
  if (!res.ok) {
    throw new Error(`Polymarket API ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as unknown;
  const markets = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && "markets" in data
      ? ((data as { markets: unknown }).markets as unknown[])
      : [];
  const tokens = tokenize(topic);
  const items: ResearchItemInput[] = [];

  for (const m of markets) {
    if (!m || typeof m !== "object") continue;
    const row = m as Record<string, unknown>;
    const question = String(row.question ?? row.title ?? "").trim();
    const slug = String(row.slug ?? "");
    if (!question) continue;
    const text = question.toLowerCase();
    let scoreOverlap = 0;
    for (const t of tokens) {
      if (text.includes(t)) scoreOverlap += 1;
    }
    if (tokens.size > 0 && scoreOverlap === 0) continue;

    const url =
      slug.length > 0
        ? `https://polymarket.com/event/${slug}`
        : `https://polymarket.com/`;
    const end = row.endDateIso ?? row.end_date_iso;
    let publishedAt: number | undefined;
    if (typeof end === "string") {
      const d = Date.parse(end);
      if (!Number.isNaN(d)) publishedAt = d / 1000;
    }

    items.push({
      source: "polymarket",
      title: question.slice(0, 500),
      url,
      snippet: question.slice(0, 500),
      publishedAt,
      raw: row,
    });
  }

  return items.slice(0, 30);
}

function tokenize(topic: string): Set<string> {
  return new Set(
    topic
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length >= 2)
  );
}
