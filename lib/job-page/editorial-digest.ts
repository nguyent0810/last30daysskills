/**
 * Short scan-layer digest: two buckets only — fewer columns, clearer scan.
 */

export type DigestBucketId = "learn" | "discuss";

export type DigestItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  source: string;
};

/** Tutorials, docs, tools, releases — “read / build”. Everything else is conversation & misc. */
const LEARN_BUILD =
  /tutorial|guide|how\s*to|learn|introduction|getting\s*started|course|documentation|docs?\b|tool|library|framework|release|launch|\brepo\b|github|api\b|sdk|\bapp\b|plugin|package/i;

export function bucketForItem(title: string, snippet: string): DigestBucketId {
  const text = `${title} ${snippet}`;
  if (LEARN_BUILD.test(text)) return "learn";
  return "discuss";
}

const BUCKET_ORDER: DigestBucketId[] = ["learn", "discuss"];

const BUCKET_LABEL: Record<DigestBucketId, string> = {
  learn: "Guides & tools",
  discuss: "Threads & conversation",
};

export function bucketLabel(id: DigestBucketId): string {
  return BUCKET_LABEL[id];
}

export type GroupedDigest = {
  bucket: DigestBucketId;
  label: string;
  items: DigestItem[];
}[];

/** Group by bucket, sort each bucket by score desc. */
export function groupItemsForDigest(items: DigestItem[]): GroupedDigest {
  const map = new Map<DigestBucketId, DigestItem[]>();
  for (const b of BUCKET_ORDER) map.set(b, []);

  for (const it of items) {
    const b = bucketForItem(it.title, it.snippet);
    map.get(b)!.push(it);
  }

  for (const list of map.values()) {
    list.sort((a, b) => b.score - a.score);
  }

  const out: GroupedDigest = [];
  for (const b of BUCKET_ORDER) {
    const list = map.get(b)!;
    if (list.length > 0) {
      out.push({ bucket: b, label: BUCKET_LABEL[b], items: list });
    }
  }
  return out;
}

/** Initial visible items per section (scan layer stays short). */
export const DIGEST_INITIAL_PER_SECTION = 2;

/** Hard cap per bucket when expanded (avoid second dump). */
export const DIGEST_MAX_PER_SECTION = 8;
