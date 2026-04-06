# Publish Angles — Phase 2 AI polish (tightened execution slice)

> **Status:** Directionally approved. Implement only what is in this document for the first pass.  
> **Depends on:** Phase 1 complete (`publishAngles` on `GET /api/jobs/[id]`, Overview tab).

---

## Locked product decisions

1. **English only** — No `language` field on the polish API for this pass. Prompts and validation assume English. Do not wire `RecapLanguage` for polish yet.
2. **Augment, not replace** — The deterministic card (title, dek, why-it-matters, outline, citations) **stays visible and primary**. Polished fields render in a **distinct sub-block** below (e.g. “AI polish (draft)”) with clear visual hierarchy; user always sees the original angle first.
3. **`lead` is minimal** — Not a mini-article intro. Hard cap: **≤ 240 characters** after trim (implement in Zod + quality). At most **two sentences** in prompt instructions; prefer one tight sentence when possible.
4. **`bullets` refine outline only** — Count: **same length as the deterministic `outline` array** for that opportunity (typically 2–4). The model **rewrites each corresponding bullet** for clarity and parallel structure; **no new bullets**, no merged/split bullets, no new facts or entities not grounded in that bullet + the citation titles/sources in context. If outline has 3 items, response must have exactly 3 bullets, aligned by index.
5. **No citation URLs in the model context (default)** — Pass **title + source** only for each cited item (and optional **trimmed snippet** from DB, capped, if needed for disambiguation). **Do not** pass URLs to the model in v1 unless a future pass proves ambiguity; server still validates and **echoes** canonical citations in the HTTP response from DB/deterministic opportunity.

---

## Optional (cheap) “no meaningful polish” detection

If implementation cost is low, after a successful parse:

- Build **normalized fingerprints** of (a) deterministic `workingTitle + dek + outline.join` and (b) polished `headline + dek + bullets.join` (lowercase, collapse whitespace, strip punctuation optional).
- If **identical** or **Levenshtein ratio ≥ 0.97** (or similar single threshold in one helper), set a flag on the response, e.g. `polishNote: "minimal_change"` | `null`, and still return 200 with the polished JSON so the UI can show a muted line: “Little change suggested — your angle was already tight.”

If this adds more than ~30 lines or a new dependency, **skip** for v1 and leave a TODO in code comment.

---

## API (first pass)

**`POST /api/jobs/[id]/publish-angles/polish`**

**Body:**

```json
{ "opportunityIndex": 0 }
```

- `opportunityIndex`: non-negative integer; must be `< publishAngles.opportunities.length` after server recomputes `buildPublishAnglesPhase1`.

**Headers:** Optional `x-gemini-api-key` (BYOK), same as ai-recap.

**Response 200:**

```typescript
type PublishAnglePolishResponse = {
  headline: string;
  dek: string;
  lead: string; // ≤ 240 chars
  bullets: string[]; // length === deterministic outline.length for that index
  citations: Array<{ title: string; url: string; source: string }>; // server echo only, from DB/opportunity
  polishNote?: "minimal_change"; // optional, see above
};
```

**Errors:** Align with existing patterns (`401`, `403` + `JOB_NOT_ELIGIBLE`, `404`, `503` + `AI_NOT_CONFIGURED`, `502` + parse/quality/provider failure codes). English-only errors are fine.

---

## Eligibility and server flow

1. Same auth and job ownership as `ai-recap`.
2. `job.status === "succeeded"`.
3. Provider: `resolveThreadCompressionProvider()` or BYOK Gemini; if not ok → 503 `AI_NOT_CONFIGURED`.
4. Load data needed to run **`buildPublishAnglesPhase1`** with the **same inputs as GET** (report, items, sourceRuns, topic) — **no new migrations**; query set may match GET handler (acceptable as POST-local cost).
5. Resolve `opportunities[opportunityIndex]`; if missing → 400 or 403 with clear code.
6. Build **polish context** (English): topic, optional thread display title, one opportunity’s `workingTitle`, `dek`, `whyItMatters`, `outline[]`, and for each citation **title + source** (+ optional capped snippet from `research_items` matched by title/source, not URL in model text—matching can use URL server-side to fetch snippet).
7. Call `runThreadCompression(system, user, provider)` with JSON-only output instructions.
8. Parse JSON with Zod; run `isPolishOutputAcceptable`; enforce **bullet count === outline.length**; enforce **lead length ≤ 240**; **strip/ignore any URL-like strings** in model output fields if they appear (defense in depth).
9. Set `citations` from deterministic opportunity + DB row validation (trim URLs); **never** from model.
10. Optional: `minimal_change` fingerprint check.

---

## Prompting (summary)

- **System:** You are an editor rewriting for clarity in **English** only. Do not add facts, entities, numbers, dates, or causal claims not supported by the INPUT. Output **valid JSON** only with keys: `headline`, `dek`, `lead`, `bullets` (array of strings).
- **User:** Structured sections: INPUT ANGLE (fields as above), CITATIONS (title + source per line, no URLs), RULES: `bullets` must have **exactly N** entries matching the N outline lines in order; each bullet is a rewrite of that line only; `lead` at most two short sentences and under 240 characters; stay anchored to the angle and citation titles.

---

## UI (summary)

- Per card: **“Polish with AI”** when `aiRecapConfigured` (reuse job payload flag).
- On success: show **augment** block under deterministic content — polished headline (as subhead), dek, lead, bullets — with label **“AI polish (draft)”** and existing disclaimer tone (short, muted).
- Loading/error: per-card only; deterministic block unchanged.

---

## Files (expected)

| Action | Path |
|--------|------|
| Add | `app/api/jobs/[id]/publish-angles/polish/route.ts` |
| Add | `lib/publish-angles/polish-context.ts` |
| Add | `lib/publish-angles/polish-prompt.ts` |
| Add | `lib/publish-angles/polish-schema.ts` (Zod) |
| Add | `lib/publish-angles/polish-quality.ts` |
| Add | `lib/publish-angles/polish-*.test.ts` (schema + quality + bullet length) |
| Change | `components/PublishAnglesPanel.tsx` |
| Change | `app/job/[id]/page.tsx` (pass `jobId`, `aiRecapConfigured`) |

**Do not change:** `build-phase1.ts` derivation/ranking; `GET /api/jobs/[id]` contract (unless adding a redundant flag—prefer not).

---

## Testing (minimum)

- Zod: valid/invalid JSON, wrong `bullets.length`, `lead` too long.
- Quality: empty fields, English-only assumption (smoke).
- Optional: fingerprint test for `minimal_change`.

---

## Non-goals (unchanged from Phase 2 plan)

No DB persistence, Home, workers, batch polish, new sources, full report in context, URL lists to the model, CMS/editor, non-English, or replacing the deterministic card.

---

**End of tightened Phase 2 polish slice.**
