# Phase 6 V1 — Thread AI compression (milestone)

## Shipped

- **Authenticated thread page only:** optional “Shorten with AI (experimental)” under Thread brief.
- **API:** `POST /api/research/[id]/ai-summary` (no persistence). Deploy-time provider: `AI_SUMMARY_PROVIDER=hf` or `gemini` with paired env vars (see `.env.example` and `docs/DEPLOYMENT.md`).
- **Gating:** UI and API require `runs.length >= 2` **or** thread brief text length `> 600`, and server reports `aiSummaryAvailable` when compression env is valid.
- **Pipeline:** Bounded context (4k), normalized `CompressionResult`, 20s timeout, output capped at 1200 characters.

## Manual smoke (operator)

| Scenario | Expect |
|----------|--------|
| HF configured, dense thread (2+ runs or long brief) | Button visible; POST returns 200 `{ text }`; summary replaces on repeat |
| Gemini configured, dense thread | Same |
| Missing / invalid provider env | Button hidden (`aiSummaryAvailable: false`); POST 503 `AI_NOT_CONFIGURED` |
| Upstream error or timeout | POST 502 with provider `code`; error line in UI |
| Non-dense thread (1 run, brief ≤600) | Button hidden; POST 403 `AI_SUMMARY_NOT_ELIGIBLE` if forced |
| Rerun after success | New text replaces prior block (no stacking) |

## Verification already automated

- `npm test` — context truncation, language heuristics, eligibility, output cap.
- `npm run build` — typecheck and compile.
