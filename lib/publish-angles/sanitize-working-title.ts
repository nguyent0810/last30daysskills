/**
 * Presentation-only cleanup for publish-angle card titles.
 * Does not change ranking, alignment, or retrieval.
 */

/** Trailing `(source, score N.NN)` as emitted in deterministic reports (hn, reddit, polymarket, etc.). */
const TRAILING_SOURCE_SCORE = /\s*\(\s*[a-z0-9_]+\s*,\s*score\s*[0-9.]+\s*\)\s*$/i;

export function sanitizeWorkingTitleForDisplay(raw: string): string {
  let s = raw.replace(/\*\*/g, "").trim();
  s = s.replace(TRAILING_SOURCE_SCORE, "").trim();
  s = s.replace(/\s+/g, " ");
  return s;
}
