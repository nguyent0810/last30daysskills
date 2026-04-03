const MAX_OUTPUT_CHARS = 1200;

export function truncateCompressionOutput(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_OUTPUT_CHARS) return t;
  return `${t.slice(0, MAX_OUTPUT_CHARS - 1)}…`;
}
