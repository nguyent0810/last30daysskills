const MAX_CONTEXT_CHARS = 4000;
const CONTEXT_TRUNCATED_MARKER = "\n[CONTEXT TRUNCATED]";

const REPORT_EXCERPT_MAX_CHARS = 2800;
const TOP_ITEMS_MAX = 4;
const ITEM_SNIPPET_MAX_CHARS = 160;

export type RunRecapTopItem = {
  source: string;
  title: string;
  snippet: string;
};

export type RunRecapContextInput = {
  topic: string;
  displayTitle: string | null | undefined;
  jobStatus: string;
  reportMode: string;
  reportMarkdown: string;
  items: RunRecapTopItem[];
};

function capText(s: string, maxChars: number): { text: string; truncated: boolean } {
  const t = s.trim();
  if (t.length <= maxChars) return { text: t, truncated: false };
  return { text: t.slice(0, maxChars), truncated: true };
}

/**
 * Builds bounded, compression-only context for run recap (Phase C).
 *
 * Contract:
 * - Must include Topic / (optional) Display title / Run status / Report mode
 * - Must include report excerpt (main evidence)
 * - Must include up to 4 top items (source/title/snippet; no URLs, no scores)
 * - Total context capped <= 4000 chars, with [CONTEXT TRUNCATED] marker when truncated.
 */
export function buildRunRecapContext(src: RunRecapContextInput): string {
  const lines: string[] = [];

  lines.push(`Topic: ${src.topic}`);
  const display = src.displayTitle?.trim();
  if (display) lines.push(`Display title: ${display}`);

  lines.push("");
  lines.push(`Run status: ${src.jobStatus}`);
  lines.push(`Report mode: ${src.reportMode}`);

  lines.push("");
  lines.push("--- Report excerpt ---");

  const excerptCap = capText(src.reportMarkdown ?? "", REPORT_EXCERPT_MAX_CHARS);
  lines.push(excerptCap.text);

  lines.push("");
  lines.push("--- Top items ---");

  const items = src.items.slice(0, TOP_ITEMS_MAX);
  for (const it of items) {
    lines.push(`- Source: ${it.source} | Title: ${it.title}`);
    const snipCap = capText(it.snippet ?? "", ITEM_SNIPPET_MAX_CHARS);
    // Snippet is required to be <= 160 chars (trimmed).
    lines.push(`  Snippet: ${snipCap.text}`);
  }

  let out = lines.join("\n");

  // If report excerpt was capped, or the overall string is too large, enforce the global cap.
  const truncated =
    excerptCap.truncated || out.length > MAX_CONTEXT_CHARS || out.trim().length > MAX_CONTEXT_CHARS;

  if (truncated) {
    out = out.slice(0, MAX_CONTEXT_CHARS - CONTEXT_TRUNCATED_MARKER.length) + CONTEXT_TRUNCATED_MARKER;
  }

  return out;
}

