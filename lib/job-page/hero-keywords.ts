/** Pull 1–2 concrete tokens from top result titles/snippets — deterministic, no LLM. */

export type ItemText = { title: string; snippet: string };

const STOP = new Set(
  [
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "you",
    "all",
    "can",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "its",
    "may",
    "new",
    "now",
    "old",
    "see",
    "two",
    "way",
    "who",
    "boy",
    "did",
    "she",
    "use",
    "her",
    "many",
    "some",
    "time",
    "very",
    "when",
    "with",
    "have",
    "this",
    "that",
    "from",
    "they",
    "been",
    "into",
    "more",
    "than",
    "what",
    "your",
    "will",
    "about",
    "after",
    "also",
    "back",
    "could",
    "first",
    "just",
    "like",
    "make",
    "most",
    "only",
    "over",
    "such",
    "their",
    "them",
    "then",
    "these",
    "think",
    "well",
    "were",
    "here",
    "show",
    "http",
    "https",
    "www",
    "com",
    "org",
    "ask",
    "reddit",
    "comments",
    "thread",
    "discussion",
    "news",
    "update",
    "today",
    "year",
    "years",
  ].map((s) => s.toLowerCase())
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .split(/[^a-z0-9+#]+/g)
    .filter((w) => w.length >= 3);
}

/** Display form: preserve casing from first title that contains the word. */
function displayForm(word: string, items: ItemText[]): string {
  const re = new RegExp(`\\b(${escapeRe(word)})\\b`, "i");
  for (const it of items) {
    const m = it.title.match(re);
    if (m) return m[1];
  }
  return word.length ? word[0].toUpperCase() + word.slice(1) : word;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Up to 2 keywords from the highest-scored items (caller should pass items sorted by score desc).
 */
export function keywordsFromTopItems(items: ItemText[], scanCount = 8): string[] {
  if (items.length === 0) return [];
  const freq = new Map<string, number>();

  for (const it of items.slice(0, scanCount)) {
    for (const w of tokenize(it.title)) {
      if (STOP.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 3);
    }
    for (const w of tokenize(it.snippet)) {
      if (STOP.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out: string[] = [];
  for (const [w] of ranked) {
    if (out.length >= 2) break;
    if (out.some((x) => x.toLowerCase() === w)) continue;
    out.push(displayForm(w, items));
  }

  return out.slice(0, 2);
}

export function formatKeywordPhrase(keywords: string[]): string {
  if (keywords.length === 0) return "";
  if (keywords.length === 1) return `“${keywords[0]}”`;
  return `“${keywords[0]}” and “${keywords[1]}”`;
}
