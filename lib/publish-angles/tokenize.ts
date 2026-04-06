import { EN_STOPWORDS } from "./stopwords";

/** Lowercase alnum tokens; drops stopwords and empties. */
export function tokenizeForOverlap(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !EN_STOPWORDS.has(t));
  return normalized;
}

export function wordSetJaccard(a: string, b: string): number {
  const ta = tokenizeForOverlap(a);
  const tb = tokenizeForOverlap(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let inter = 0;
  for (const w of setA) {
    if (setB.has(w)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}
