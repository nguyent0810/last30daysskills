# Publish Angles — Phase 1 execution plan (tightened)

> **Scope:** This document is the **only** spec to implement for the first slice. It supersedes broader ideas in `publish-angles-implementation-plan.md` for Phase 1.

---

## Explicit non-goals (Phase 1)

- No Home page changes (no right-rail teaser, no deep links from `/`).
- No AI polish endpoint, no prompts, no dependency on `aiRecapConfigured` / HF / Gemini for this feature.
- No new DB columns, tables, caches, or persisted angle history.
- No workers, cron, queues, or scheduled fetches.
- No new external data sources (HN/Reddit/RSS/GitHub beyond what the run already collected).
- No cross-run or thread-level aggregation **queries** (no pulling previous runs’ items or reports for novelty).
- No duplication of the existing **Key findings** / `EditorialDigest` grid in this panel (no second learn/discuss column layout in Phase 1).

---

## Query and payload discipline

**Rule:** Phase 1 adds **zero** new database queries to `GET /api/jobs/[id]`.

The handler already loads everything needed to derive angles in memory:

- `report` (`reports.content`)
- `items` (top 25 by `score`, includes `id` for existing consumers)
- `sourceRuns` (`research_source_runs` rows for this job)

**Aggregation rule:** `buildPublishAnglesPhase1(...)` must be **O(n)** over the already-fetched arrays (small fixed caps on string processing). No extra round-trips, no joining other jobs or researches for insight.

**Rationale:** Keeps the job GET from becoming a “kitchen sink” endpoint; cost is bounded to one synchronous pure function on the current payload.

---

## API shape addition (exact)

Add a single top-level property on the existing successful JSON body:

| Field | Type | Notes |
|-------|------|--------|
| `publishAngles` | `PublishAnglesPhase1 \| null` | `null` only if the server skips building (see below). Prefer **always** returning an object when `job` exists. |

### TypeScript shape (contract)

```typescript
/** Public citations: no item UUIDs — UI keys use `url` + index. */
export type PublishAnglesCitation = {
  title: string;
  url: string;
  /** Same codes as stored items: "hn" | "reddit" | "polymarket" (pass-through). */
  source: string;
};

export type PublishAnglesOpportunity = {
  workingTitle: string;
  dek: string;
  /** One short sentence; deterministic template, no model. */
  whyItMatters: string;
  /** 2–4 bullets, deterministic. */
  outline: string[];
  citations: PublishAnglesCitation[];
  confidence: "high" | "medium" | "low";
};

export type PublishAnglesPhase1 = {
  version: 1;
  /**
   * report-led: at least one opportunity came from a report finding with strong item alignment.
   * items-led: fallback — opportunities built only from top source-backed items.
   */
  derivation: "report-led" | "items-led";
  /** Single line from this job’s sourceRuns only (no thread history). */
  momentumLine: string | null;
  opportunities: PublishAnglesOpportunity[];
};
```

### Server policy

- **Always** attach `publishAngles` when the GET returns 200 with a job (simplest for the client).
- Build inputs: `reportMarkdown: string | null`, `items` (same rows as today), `sourceRuns` (same rows as today).
- **Do not** embed raw report bodies or snippets inside `publishAngles` beyond what appears in `workingTitle` / `dek` / `outline` / `whyItMatters` (keep response small).

### Citation safety

- Each citation **must** correspond to an actual row in `items` for this job (source-backed).
- `title` and `url` are copied from that row (trimmed); `source` copied from row.
- **Strip internal `id`** from the `publishAngles` subtree only — the top-level `items` array is unchanged for `EditorialDigest`.
- URLs are rendered only as `href` on anchors with `rel="noopener noreferrer"` and `target="_blank"` (same pattern as `EditorialDigest`). Do not interpret HTML in titles/snippets; React text nodes are sufficient.

---

## Derivation and fallback rules (exact)

### Constants (tunable in one module, tested)

- `MAX_FINDING_BLOCKS = 6` (parse cap)
- `MAX_OPPORTUNITIES = 3`
- `ALIGNMENT_STRONG_MIN = 0.12` — best pairwise score between a finding text blob and an item (`title + " " + snippet`) must be ≥ this to attach that item to the finding
- Items-led candidacy: first **15** rows of the already-sorted `items` array (by score desc), then dedupe by `url` when building up to `MAX_OPPORTUNITIES` (no extra score floor in Phase 1)

### Token overlap (report-led path only)

- Normalize: lowercase, strip punctuation, split on whitespace, drop stopwords (small static English list ~40 words: the, a, an, is, are, …).
- **Score** = |intersection| / |union| of word sets (Jaccard) between finding text and each item’s `title + snippet`.
- **Strong alignment** for one finding: `maxScore >= ALIGNMENT_STRONG_MIN` and winning item is unique enough (if two items tie within 0.02, attach **both** citations, max 2 citations per finding).

### Report-led path

1. Parse numbered finding blocks using the **same** heading detection as `lib/job-page/report-preview.ts` (`FINDINGS_HEADING` + `splitNumberedFindingBlocks`). If no section or zero blocks → go to **items-led**.
2. For each finding (up to `MAX_FINDING_BLOCKS`), compute overlap to all items (cap items considered to **first 15** by score to bound work).
3. Keep findings where strong alignment holds; build one opportunity per such finding:
   - `workingTitle`: first line of finding, trimmed, max 90 chars (ellipsis)
   - `dek`: first sentence of finding or first 140 chars
   - `whyItMatters`: deterministic template, e.g. “Source-backed angle tied to your report’s highlighted finding and top retrieved links.”
   - `outline`: 2–4 bullets — (a) paraphrase first two lines of finding into short verb-led bullets; (b) add bullet “Verify claims against the cited sources before publishing.”
   - `citations`: 1–2 aligned items mapped to `PublishAnglesCitation`
   - `confidence`: `high` if `maxScore >= 0.2`, else `medium`
4. Sort by alignment score desc; take top `MAX_OPPORTUNITIES`.
5. If after step 4 **zero** opportunities → **items-led**.

### Items-led path (mandatory fallback)

Used when:

- No parseable findings section, or
- Zero findings pass strong alignment, or
- Parsed findings exist but alignment is uniformly weak

**Algorithm:**

1. Take items **already ordered by score desc** (same array as API). Consider the first **min(5, items.length)** for candidacy.
2. Build **up to `MAX_OPPORTUNITIES`** opportunities **one-to-one** from the top distinct items (skip duplicate `url`):
   - `workingTitle` = item `title` trimmed, max 90 chars
   - `dek` = `snippet` trimmed, max 160 chars (ellipsis)
   - `whyItMatters` = deterministic template, e.g. “High-scoring retrieved source for this topic — shape an article around the primary claim and verify in the full report.”
   - `outline`: exactly 3 bullets:
     - “Lead with what’s new or contested in this source.”
     - “Cross-check with the full report and other sources in this run.”
     - “Add context for readers unfamiliar with {truncated topic from `job.topic`}.”
   - `citations`: single citation from that item
   - `confidence`: `medium` if item score is in top 3 of run, else `low`
3. Set `derivation: "items-led"`.

### Momentum line

- **Inputs:** only `sourceRuns` + `job.topic` string.
- **No** thread insight, no previous run comparison (would require extra queries).
- Implement as a small deterministic string function (e.g. total item count, which sources succeeded, “HN-heavy” phrasing) aligned with tone of `lib/job-page/source-interpretation.ts`. If all runs failed or counts are zero, `momentumLine: null`.

---

## UI states (exact)

All on **`/job/[id]`**, **Overview** tab only, below the existing short orientation copy.

| Condition | What to show |
|-----------|----------------|
| `data === null` (initial load) | Render **nothing** for the angles region (page-level loading already applies). |
| `job.status` is `queued` or `running` | One `p.muted`: “Publishing angles appear when this run finishes.” No cards. |
| `job.status` is `failed` | If `publishAngles.opportunities.length === 0`: “No source-backed angles for this run.” If length > 0: show panel + prepend one muted line: “Run did not complete — angles are from retrieved sources only.” |
| `job.status` is `succeeded` and `opportunities.length === 0` | “No angles surfaced for this run (thin report or sources).” |
| `opportunities.length > 0` | Section title + hint + list of cards; show `momentumLine` above cards when non-null. |
| Copy action (optional Phase 1) | One “Copy” per card copies plain text (title, dek, outline, citation URLs) — if omitted, Phase 1 can ship **without** copy buttons to stay even smaller; **recommend including one copy per card** for usefulness without new APIs. |

**Accessibility:** wrap in `<section aria-label="Publishing angles">`.

---

## Files to touch (exact list)

| Action | Path |
|--------|------|
| Create | `lib/publish-angles/types.ts` — exported types matching API contract |
| Create | `lib/publish-angles/stopwords.ts` — small static list |
| Create | `lib/publish-angles/tokenize.ts` — normalize + Jaccard |
| Create | `lib/publish-angles/parse-findings.ts` — re-use logic from `report-preview.ts` (import helpers, do not duplicate regex blindly) |
| Create | `lib/publish-angles/momentum-from-source-runs.ts` — momentum line |
| Create | `lib/publish-angles/build-phase1.ts` — orchestration + fallback rules |
| Create | `lib/publish-angles/build-phase1.test.ts` — vitest: report-led, items-led, empty, failed alignment |
| Modify | `app/api/jobs/[id]/route.ts` — call `buildPublishAnglesPhase1`, add `publishAngles` to JSON |
| Create | `components/PublishAnglesPanel.tsx` — presentational |
| Modify | `app/job/[id]/page.tsx` — extend `JobPayload`, render panel in Overview tab |

**Do not modify** in Phase 1: `app/page.tsx`, any `ai-recap` routes, `lib/db/schema.ts`, worker, Home CSS grid.

---

## Implementation order (for executing-plans)

1. Pure `build-phase1` + unit tests (no HTTP).
2. Wire into `app/api/jobs/[id]/route.ts` (no new queries).
3. `PublishAnglesPanel` + job page Overview integration.
4. `npm test` + `npm run lint`.

---

## Self-check before merge

- [ ] `GET /api/jobs/[id]` query count unchanged from main.
- [ ] `publishAngles` never includes item UUIDs in `citations`.
- [ ] Every citation `url` exists on a returned `items` row for this job (same run).
- [ ] `derivation` matches how opportunities were built.
- [ ] No AI env vars or recap code paths referenced.

---

**End of Phase 1 execution spec.**
