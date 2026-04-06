/**
 * Phase 1 publish-angles heuristics — single source of truth for tuning.
 */

export const PUBLISH_ANGLES_PHASE1 = {
  /** Max numbered finding blocks read from the report. */
  MAX_FINDING_BLOCKS: 6,
  /** Max opportunity cards returned. */
  MAX_OPPORTUNITIES: 3,
  /** Jaccard threshold for finding ↔ item alignment (report-led). */
  ALIGNMENT_STRONG_MIN: 0.12,
  /** Items within this delta of the best score are tied for citation inclusion. */
  ALIGNMENT_TIE_DELTA: 0.02,
  /** Confidence "high" when best alignment meets or exceeds this. */
  HIGH_CONFIDENCE_MIN: 0.2,
  /** Top items (by score order) considered for per-finding alignment. */
  ITEMS_SLICE_FOR_ALIGNMENT: 15,
  /** Pool for items-led fallback (dedupe by URL, then take first N opportunities). */
  ITEMS_LED_CANDIDATE_POOL: 15,
  WORKING_TITLE_MAX: 90,
  DEK_REPORT_MAX: 140,
  DEK_ITEM_MAX: 160,
  OUTLINE_LINE_MAX: 72,
  /** Rank index (0-based) in full sorted items list for items-led "medium" confidence. */
  ITEMS_LED_MEDIUM_RANK_MAX: 2,
} as const;
