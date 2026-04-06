import { POLISH_LEAD_MAX_CHARS } from "./polish-schema";

/** Remove http(s) URLs from model text (defense in depth). */
export function stripUrlLikeSequences(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)\]]+/gi, "")
    .replace(/\bwww\.[^\s)\]]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyStripToFields(p: {
  headline: string;
  dek: string;
  lead: string;
  bullets: string[];
}): { headline: string; dek: string; lead: string; bullets: string[] } {
  return {
    headline: stripUrlLikeSequences(p.headline),
    dek: stripUrlLikeSequences(p.dek),
    lead: stripUrlLikeSequences(p.lead),
    bullets: p.bullets.map((b) => stripUrlLikeSequences(b)),
  };
}

export function sanitizePolishModelFields(p: {
  headline: string;
  dek: string;
  lead: string;
  bullets: string[];
}): { headline: string; dek: string; lead: string; bullets: string[] } {
  const s = applyStripToFields(p);
  return {
    ...s,
    lead: s.lead.length > POLISH_LEAD_MAX_CHARS ? s.lead.slice(0, POLISH_LEAD_MAX_CHARS - 1) + "…" : s.lead,
  };
}

const MIN_HEADLINE = 4;
const MIN_DEK = 8;
const MIN_LEAD = 12;
const MIN_BULLET = 6;

export function isPolishOutputAcceptable(p: {
  headline: string;
  dek: string;
  lead: string;
  bullets: string[];
  expectedBulletCount: number;
}): boolean {
  const { headline, dek, lead, bullets, expectedBulletCount } = p;
  if (bullets.length !== expectedBulletCount || expectedBulletCount < 1) return false;
  if (headline.trim().length < MIN_HEADLINE || dek.trim().length < MIN_DEK) return false;
  if (lead.trim().length < MIN_LEAD || lead.length > POLISH_LEAD_MAX_CHARS) return false;
  for (const b of bullets) {
    if (b.trim().length < MIN_BULLET) return false;
  }
  const refusal = /as an ai|i cannot|i can't|unable to comply/i;
  if (refusal.test(headline + dek + lead)) return false;
  return true;
}

function normalizeForFingerprint(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein ratio in [0,1]; 1 = identical. */
function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  const dist = row[n]!;
  return 1 - dist / Math.max(m, n);
}

export function polishMinimalChangeNote(
  workingTitle: string,
  dek: string,
  outline: string[],
  polished: { headline: string; dek: string; bullets: string[] }
): "minimal_change" | undefined {
  const before = normalizeForFingerprint(`${workingTitle} ${dek} ${outline.join(" ")}`);
  const after = normalizeForFingerprint(`${polished.headline} ${polished.dek} ${polished.bullets.join(" ")}`);
  if (before.length === 0 || after.length === 0) return undefined;
  if (before === after) return "minimal_change";
  const r = levenshteinRatio(before, after);
  return r >= 0.97 ? "minimal_change" : undefined;
}
