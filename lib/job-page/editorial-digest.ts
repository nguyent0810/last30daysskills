/**
 * Short scan-layer digest: bucket items by simple keyword heuristics.
 * Not a second report — cap visible rows per section when rendering.
 */

export type DigestBucketId = "tutorials" | "discussions" | "tools" | "other";

export type DigestItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  source: string;
};

const TUTORIAL = /tutorial|guide|how\s*to|learn|introduction|getting\s*started|course|documentation|docs?\b/i;
const DISCUSSION = /discussion|thread|debate|opinion|\bask\b|ama|thoughts|\bwhy\b|what\s+do\s+you/i;
const TOOLS = /tool|library|framework|release|launch|\brepo\b|github|api\b|sdk|\bapp\b|plugin|package/i;

export function bucketForItem(title: string, snippet: string): DigestBucketId {
  const text = `${title} ${snippet}`;
  if (TUTORIAL.test(text)) return "tutorials";
  if (DISCUSSION.test(text)) return "discussions";
  if (TOOLS.test(text)) return "tools";
  return "other";
}

const BUCKET_ORDER: DigestBucketId[] = ["tutorials", "discussions", "tools", "other"];

const BUCKET_LABEL: Record<DigestBucketId, string> = {
  tutorials: "Tutorials & guides",
  discussions: "Discussions",
  tools: "Tools & launches",
  other: "More highlights",
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
