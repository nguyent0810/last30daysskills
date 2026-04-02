/**
 * Collapse long markdown reports for first paint: show top N numbered findings, full doc on expand.
 * Tuned for deterministic reports (## Top findings … ## Sources used). Best-effort for other shapes.
 */

export const DEFAULT_VISIBLE_FINDINGS = 8;

export type ReportPreview = {
  /** Markdown to show when collapsed */
  collapsed: string;
  /** True if collapsed view omits material (expand control should show) */
  hasMore: boolean;
  visibleFindings: number;
  totalFindings: number;
};

const FINDINGS_HEADING = /^##\s*(Top findings|Key findings|Findings|Summary highlights)\s*$/im;

function nextSectionIndex(md: string, from: number): number {
  const rest = md.slice(from);
  const m = /\n##\s+/m.exec(rest);
  return m ? from + m.index : -1;
}

/** Split numbered blocks like "1. ..." at line start. */
export function splitNumberedFindingBlocks(body: string): string[] {
  const trimmed = body.replace(/^\s+/, "");
  if (!trimmed) return [];
  const parts = trimmed.split(/(?=^\d+\.\s+)/m);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function buildReportPreview(full: string, maxVisible = DEFAULT_VISIBLE_FINDINGS): ReportPreview {
  const m = FINDINGS_HEADING.exec(full);
  if (!m || m.index === undefined) {
    return { collapsed: full, hasMore: false, visibleFindings: 0, totalFindings: 0 };
  }

  const headingStart = m.index;
  const headingEnd = headingStart + m[0].length;
  const bodyEnd = nextSectionIndex(full, headingEnd);
  const findingsBody = bodyEnd === -1 ? full.slice(headingEnd) : full.slice(headingEnd, bodyEnd);
  const suffix = bodyEnd === -1 ? "" : full.slice(bodyEnd);

  const blocks = splitNumberedFindingBlocks(findingsBody);
  if (blocks.length === 0) {
    return { collapsed: full, hasMore: false, visibleFindings: 0, totalFindings: 0 };
  }

  const totalFindings = blocks.length;
  const visible = blocks.slice(0, maxVisible);
  const truncatedFindings = totalFindings > maxVisible;
  const hasTail = suffix.trim().length > 0;
  const hasMore = truncatedFindings || hasTail;

  if (!hasMore) {
    return { collapsed: full, hasMore: false, visibleFindings: totalFindings, totalFindings };
  }

  const prefix = full.slice(0, headingEnd);
  const findingsMd = visible.join("\n\n");
  let note = "";
  if (truncatedFindings) {
    note = `\n\n_Showing ${visible.length} of ${totalFindings} highlights — open the full report for the rest._`;
  } else if (hasTail) {
    note = `\n\n_Sources and closing notes are in the full report._`;
  }

  const collapsed = `${prefix}${findingsMd}${note}`;
  return {
    collapsed,
    hasMore: true,
    visibleFindings: visible.length,
    totalFindings,
  };
}
