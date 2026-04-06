import { parseFindingBlocksFromReport } from "@/lib/job-page/report-preview";

export function parseFindingBlocks(markdown: string | null | undefined): string[] {
  if (markdown == null || !markdown.trim()) return [];
  return parseFindingBlocksFromReport(markdown);
}
