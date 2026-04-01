import type { ResearchItemInput } from "./types";

/** Dedupe by normalized URL; keep first occurrence. */
export function dedupeByUrl(items: ResearchItemInput[]): ResearchItemInput[] {
  const seen = new Set<string>();
  const out: ResearchItemInput[] = [];
  for (const item of items) {
    const key = normalizeUrlKey(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}
