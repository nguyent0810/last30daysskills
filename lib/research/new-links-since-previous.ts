import { urlMatchKey } from "@/lib/url-match";

/**
 * Distinct normalized URLs in `latest` that are not present in `previous` (order-first wins for latest).
 */
export function countNewLinkUrlsSincePrevious(latestUrls: string[], previousUrls: string[]): number {
  const previousSet = new Set<string>();
  for (const u of previousUrls) {
    const k = urlMatchKey(u);
    if (k) previousSet.add(k);
  }

  const seenLatest = new Set<string>();
  let n = 0;
  for (const u of latestUrls) {
    const k = urlMatchKey(u);
    if (!k || seenLatest.has(k)) continue;
    seenLatest.add(k);
    if (!previousSet.has(k)) {
      n += 1;
    }
  }
  return n;
}

/** API/UI: only return a payload when the signal is meaningful (≥1 new distinct link, latest had usable URLs). */
export function sincePreviousRunFromUrlLists(
  latestUrls: string[],
  previousUrls: string[]
): { newLinkCount: number } | null {
  const hasUsableLatest = latestUrls.some((u) => urlMatchKey(u) !== null);
  if (!hasUsableLatest) return null;

  const n = countNewLinkUrlsSincePrevious(latestUrls, previousUrls);
  if (n < 1) return null;

  return { newLinkCount: n };
}
