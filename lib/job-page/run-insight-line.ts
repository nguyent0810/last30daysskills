/**
 * One-line preview for thread/history lists from stored report markdown.
 * Best-effort strip of headings/markers; not a full markdown renderer.
 */
export function insightLineFromReport(content: string | null | undefined, maxLen = 140): string | null {
  if (content == null || !content.trim()) return null;
  let s = content
    .replace(/^#{1,6}\s+.+$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*?|__/g, "")
    .trim();
  const lines = s.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim());
  const line = lines.find((l) => l.length > 16) ?? lines.find((l) => l.length > 0) ?? "";
  if (!line) return null;
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1)}…`;
}
