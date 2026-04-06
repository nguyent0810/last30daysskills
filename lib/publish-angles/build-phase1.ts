import { PUBLISH_ANGLES_PHASE1 as C } from "./constants";
import { buildMomentumObservation } from "./momentum-from-source-runs";
import { parseFindingBlocks } from "./parse-findings";
import { sanitizeWorkingTitleForDisplay } from "./sanitize-working-title";
import { wordSetJaccard } from "./tokenize";
import type {
  PublishAnglesItemInput,
  PublishAnglesOpportunity,
  PublishAnglesPhase1,
  PublishAnglesSourceRunInput,
} from "./types";

const REPORT_WHY =
  "Source-backed angle tied to your report’s highlighted finding and top retrieved links.";
const ITEMS_WHY =
  "High-scoring retrieved source for this topic — shape an article around the primary claim and verify in the full report.";

function truncateChars(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function topicSnippet(topic: string): string {
  const t = topic.trim();
  if (!t) return "this topic";
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

function linesOfFinding(block: string): string[] {
  return block
    .split(/\n+/)
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

/** Sanitize first (strip markdown / trailing source-score), then enforce max length. */
function workingTitleFromFindingBlock(block: string): string {
  const lines = linesOfFinding(block);
  const primary = lines[0] ?? "";
  if (primary.trim()) {
    return truncateChars(sanitizeWorkingTitleForDisplay(primary), C.WORKING_TITLE_MAX);
  }
  const joined = lines.join(" ").trim();
  return truncateChars(sanitizeWorkingTitleForDisplay(joined), C.WORKING_TITLE_MAX);
}

function dekFromFinding(block: string): string {
  const flat = linesOfFinding(block).join(" ").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const m = /^.{1,400}?[.!?](?:\s|$)/.exec(flat);
  const sentence = m ? m[0].trim() : flat;
  return truncateChars(sentence, C.DEK_REPORT_MAX);
}

function outlineFromFinding(block: string): string[] {
  const lines = linesOfFinding(block);
  const bullets: string[] = [];
  if (lines[0]) {
    bullets.push(`Summarize: ${truncateChars(lines[0], C.OUTLINE_LINE_MAX)}`);
  }
  if (lines[1]) {
    bullets.push(`Add detail: ${truncateChars(lines[1], C.OUTLINE_LINE_MAX)}`);
  }
  bullets.push("Verify claims against the cited sources before publishing.");
  return bullets.slice(0, 4);
}

function itemText(it: PublishAnglesItemInput): string {
  return `${it.title} ${it.snippet}`;
}

function toCitation(it: PublishAnglesItemInput): {
  title: string;
  url: string;
  source: string;
} {
  return {
    title: it.title.trim(),
    url: it.url.trim(),
    source: it.source,
  };
}

type ScoredItem = { item: PublishAnglesItemInput; score: number };

/** Pick items tied within ALIGNMENT_TIE_DELTA of the best score, all ≥ ALIGNMENT_STRONG_MIN. */
function alignedItemsForFinding(
  findingText: string,
  itemsTop: PublishAnglesItemInput[]
): ScoredItem[] {
  const scored: ScoredItem[] = itemsTop.map((item) => ({
    item,
    score: wordSetJaccard(findingText, itemText(item)),
  }));
  if (scored.length === 0) return [];
  const best = Math.max(...scored.map((s) => s.score));
  if (best < C.ALIGNMENT_STRONG_MIN) return [];
  const floor = best - C.ALIGNMENT_TIE_DELTA;
  const tied = scored.filter((s) => s.score >= floor && s.score >= C.ALIGNMENT_STRONG_MIN);
  tied.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.url.localeCompare(b.item.url);
  });
  return tied.slice(0, 2).map((s) => ({ item: s.item, score: s.score }));
}

type ReportCandidate = {
  findingIndex: number;
  alignmentScore: number;
  opportunity: PublishAnglesOpportunity;
  sortUrl: string;
};

function buildReportLed(
  findings: string[],
  items: PublishAnglesItemInput[]
): PublishAnglesOpportunity[] | null {
  const itemsTop = items.slice(0, C.ITEMS_SLICE_FOR_ALIGNMENT);
  if (itemsTop.length === 0) return null;

  const capped = findings.slice(0, C.MAX_FINDING_BLOCKS);
  const candidates: ReportCandidate[] = [];

  for (let i = 0; i < capped.length; i++) {
    const block = capped[i]!;
    const aligned = alignedItemsForFinding(block, itemsTop);
    if (aligned.length === 0) continue;
    const alignmentScore = Math.max(...aligned.map((a) => a.score));
    const citations = aligned.map((a) => toCitation(a.item));
    const sortUrl = citations[0]!.url;
    const opportunity: PublishAnglesOpportunity = {
      workingTitle: workingTitleFromFindingBlock(block),
      dek: dekFromFinding(block) || truncateChars(block.replace(/\s+/g, " ").trim(), C.DEK_REPORT_MAX),
      whyItMatters: REPORT_WHY,
      outline: outlineFromFinding(block),
      citations,
      confidence: alignmentScore >= C.HIGH_CONFIDENCE_MIN ? "high" : "medium",
    };
    candidates.push({ findingIndex: i, alignmentScore, opportunity, sortUrl });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.alignmentScore !== a.alignmentScore) return b.alignmentScore - a.alignmentScore;
    if (a.findingIndex !== b.findingIndex) return a.findingIndex - b.findingIndex;
    return a.sortUrl.localeCompare(b.sortUrl);
  });

  return candidates.slice(0, C.MAX_OPPORTUNITIES).map((c) => c.opportunity);
}

function globalItemRank(items: PublishAnglesItemInput[], url: string): number {
  const idx = items.findIndex((it) => it.url === url);
  return idx;
}

function buildItemsLed(
  items: PublishAnglesItemInput[],
  jobTopic: string
): PublishAnglesOpportunity[] {
  const pool = items.slice(0, C.ITEMS_LED_CANDIDATE_POOL);
  const seen = new Set<string>();
  const out: PublishAnglesOpportunity[] = [];

  for (const it of pool) {
    const url = it.url.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const rank = globalItemRank(items, url);
    const confidence =
      rank >= 0 && rank <= C.ITEMS_LED_MEDIUM_RANK_MAX ? "medium" : "low";
    out.push({
      workingTitle: truncateChars(sanitizeWorkingTitleForDisplay(it.title), C.WORKING_TITLE_MAX),
      dek: truncateChars(it.snippet, C.DEK_ITEM_MAX),
      whyItMatters: ITEMS_WHY,
      outline: [
        "Lead with what’s new or contested in this source.",
        "Cross-check with the full report and other sources in this run.",
        `Add context for readers unfamiliar with ${topicSnippet(jobTopic)}.`,
      ],
      citations: [toCitation(it)],
      confidence,
    });
    if (out.length >= C.MAX_OPPORTUNITIES) break;
  }

  return out;
}

export type BuildPublishAnglesPhase1Input = {
  reportMarkdown: string | null | undefined;
  items: PublishAnglesItemInput[];
  sourceRuns: PublishAnglesSourceRunInput[];
  jobTopic: string;
};

export function buildPublishAnglesPhase1(input: BuildPublishAnglesPhase1Input): PublishAnglesPhase1 {
  const { reportMarkdown, items, sourceRuns, jobTopic } = input;
  const momentumLine = buildMomentumObservation(sourceRuns);

  const findings = parseFindingBlocks(reportMarkdown ?? null);
  const reportOps = findings.length > 0 ? buildReportLed(findings, items) : null;

  if (reportOps && reportOps.length > 0) {
    return {
      version: 1,
      derivation: "report-led",
      momentumLine,
      opportunities: reportOps,
    };
  }

  return {
    version: 1,
    derivation: "items-led",
    momentumLine,
    opportunities: buildItemsLed(items, jobTopic),
  };
}
