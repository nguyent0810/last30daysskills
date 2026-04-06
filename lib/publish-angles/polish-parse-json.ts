/**
 * Parse model text as JSON object; tolerate optional ```json fences.
 */
export function extractJsonObject(text: string): unknown {
  const t = text.trim();
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return null;
    }
  };
  const direct = tryParse(t);
  if (direct !== null) return direct;

  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence?.[1]) {
    const inner = tryParse(fence[1].trim());
    if (inner !== null) return inner;
  }

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const inner = tryParse(t.slice(start, end + 1));
    if (inner !== null) return inner;
  }

  throw new SyntaxError("Could not parse polish JSON");
}
