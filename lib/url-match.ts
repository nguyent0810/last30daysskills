/**
 * Shared URL rules for Export-lite dedupe and “new links since last run”.
 */

/** Trimmed URL; empty if only whitespace. */
export function normalizeUrlForReuse(url: string): string {
  return url.trim();
}

/** Key for set membership / dedupe: trimmed, lowercased. `null` if not usable. */
export function urlMatchKey(url: string): string | null {
  const t = normalizeUrlForReuse(url);
  if (!t) return null;
  return t.toLowerCase();
}
