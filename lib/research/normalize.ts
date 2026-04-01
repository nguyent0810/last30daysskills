import type { ResearchItemInput } from "./types";

/** Trim, collapse whitespace, strip control chars from text fields. */
export function normalizeItem(item: ResearchItemInput): ResearchItemInput {
  return {
    ...item,
    title: cleanText(item.title),
    snippet: cleanText(item.snippet),
    url: item.url.trim(),
  };
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 2000);
}
