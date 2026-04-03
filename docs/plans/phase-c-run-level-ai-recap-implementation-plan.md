# Phase C — Run-Level AI Recap (Report Page) Implementation Plan

> **For execution:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Add an optional, deterministic-first, one-shot **AI recap** for a single run’s report on the job/report page, using the existing Phase 6 provider/compression foundation (deploy-time only, no persistence, no chat).

**Architecture:** Introduce a new job-scoped API route that builds bounded context from the stored report + top items, selects the output language deterministically, calls the configured provider (HF or Gemini), and returns `{ text }`. On the client, replace the existing Gemini-only panel with a single recap block placed in the report flow, where the deterministic report remains the primary evidence.

**Tech stack:** Next.js App Router route handlers, existing Phase 6 `lib/ai/thread-compression/*` provider/select/run + language heuristics, Vitest for unit tests.

---

## Task structure

### Task 1: Define run recap UX contract

**Files:**
- `app/job/[id]/page.tsx`
- `app/globals.css` (optional small styling)

**Step 1: Confirm display conditions**
- Show the recap section only when `data.job.status === "succeeded"` and `data.report` exists and has non-empty trimmed content.
- If AI provider is not configured, render the recap section in a muted/disabled state (deterministic report unchanged).

**Step 2: Define placement**
- Place the recap section inside the **Report** area (near the “Report” header/toolbar), so users see the recap around the same time they first see the report.
- Keep it subordinate: no competing hero copy above the report’s factual text.

**Step 3: Define UI behavior**
- Button label: “Generate recap” (or similar).
- On click, disable the button while in-flight.
- On success, render the AI recap text in a single block; on re-run, **replace** the previous AI recap (no stacking).
- Provide “Dismiss” to clear only the local recap state.
- Provide “Copy recap” to copy only the AI recap text.

**Acceptance criteria:**
- Recap is clearly optional and never replaces the deterministic report.
- Re-run replaces the previous recap output in-place.
- Dismiss only clears local UI state.

---

### Task 2: Add run recap API route (provider + compression foundation)

**Files:**
- `app/api/jobs/[id]/ai-recap/route.ts` (new)
- `app/api/jobs/[id]/route.ts` (small extension to include config boolean)
- `lib/ai/run-recap/*` (new or reuse `lib/ai/thread-compression/*` with new builders)

**Step 1: Implement provider resolution and auth**
- Use the existing Phase 6 provider selection (deploy-time only): `resolveThreadCompressionProvider()`.
- Auth: require session (`getAnonymousUserIdIfPresent`) and ownership (same-user check as existing routes).

**Step 2: Implement eligibility**
- Require `job.status === "succeeded"`.
- Require stored report content exists and has non-empty trimmed text.
- If not eligible, return a 400-range response with `{ error, code }` (name TBD in this plan).

**Step 3: Build bounded context**
- Build a context string capped at **<= 4000 characters**.
- Include:
  - Topic + (optional) thread display title (if available).
  - A truncated excerpt of the stored report markdown.
  - A small list of top research items (title + snippet, capped in count/length).
  - Up to a bounded, non-identifying set of fields (no job IDs in the text).
- Truncation marker: reuse the same marker format as Phase 6 (`[CONTEXT TRUNCATED]` or matching behavior).

**Step 4: Deterministic language selection**
- Use the existing Phase 6 `resolveOutputLanguage(topic, displayTitle, fullContext)` heuristic.
- Do not add a user language selector UI for Phase C (deterministic first; optional UI selection increases divergence).

**Step 5: Prompting rules (compression only)**
- System prompt:
  - “Compression-only” behavior: 2–4 sentences, plain text only.
  - Use ONLY information in provided context.
  - No bullets (unless absolutely necessary; prefer strict plain text).

**Step 6: Call provider with shared contract**
- Use `runThreadCompression(system, user, provider)` to normalize providers into the internal `CompressionResult`.
- Keep output capped server-side (reuse Phase 6 output cap).
- Normalize empty/whitespace-only provider outputs to the `*_EMPTY` error path (recommended polish for Phase C; optional but strongly preferred).

**Step 7: Response shape**
- Success: `200 { text }`.
- Error: `4xx/5xx { error, code }`, consistent with Phase 6 error patterns.

**Acceptance criteria:**
- Route is deploy-time provider only (HF or Gemini based on `AI_SUMMARY_PROVIDER`).
- No persistence: route does not write AI output to DB.
- Context is bounded and truncated with marker if needed.

---

### Task 3: Replace/align existing run AI recap UI

**Files:**
- `app/job/[id]/page.tsx`
- `components/GeminiSummaryPanel.tsx` (optional: keep but stop using for Phase C)

**Step 1: Replace usage site**
- Remove the current `GeminiSummaryPanel` usage on the job page for Phase C.
- Insert the new run recap component in the report section.

**Step 2: Remove redundant UI controls**
- Eliminate language/style dropdowns (Phase C favors deterministic output language).

**Step 3: Keep Gemini route code intact**
- Do not delete `app/api/jobs/[id]/gemini-summary/route.ts` in this phase; it can be deprecated later.

**Acceptance criteria:**
- Only one run recap control is visible on the job page after changes.
- The recap block visually signals it is an optional assistive compression.

---

### Task 4: Tests (bounded context + language heuristic + truncation)

**Files:**
- `lib/ai/run-recap/*` unit tests (new)
- existing tests in `lib/ai/thread-compression/*` must stay green

**Step 1: Context truncation tests**
- Validate context <= 4000 chars and includes truncation marker when exceeded.

**Step 2: Language heuristic tests**
- Reuse existing language-hint tests or add one focused test that run recap context still triggers Vietnamese/zh/ja selection based on topic/title/context.

**Step 3: Output cap test**
- Ensure the provider normalization path respects 1200-char cap (reuse existing `truncate-output` tests).

**Acceptance criteria:**
- `npm test` passes.
- No regressions to thread compression tests.

---

## Recommended execution checklist
- Run: `npm test`
- Run: `npm run lint`
- Run: `npm run build`

## Non-goals (explicit)
- No chat UX.
- No schema changes.
- No Home or History changes.
- No thread-level AI polish in Phase C.

