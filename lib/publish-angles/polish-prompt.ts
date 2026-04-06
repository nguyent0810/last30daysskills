const SYSTEM = `You are a careful editor. Rewrite for clarity in English only.
Rules:
- Do not add facts, entities, numbers, dates, or causal claims not clearly supported by the INPUT ANGLE and CITATION titles/snippets.
- Output valid JSON only, no markdown fences, no commentary. Keys: "headline", "dek", "lead", "bullets" (array of strings).
- "bullets" must have exactly N entries, in the same order as the numbered outline in INPUT ANGLE (N is given in USER message). Each bullet rewrites only that outline line.
- "lead": at most two short sentences; under 240 characters total; prefer one tight sentence. This is not a full article introduction.
- Do not include URLs or link text that looks like URLs in any field.`;

export function buildPublishAnglePolishPrompts(contextBlock: string, bulletCount: number): { system: string; user: string } {
  const user = `${contextBlock}

--- RULES ---
- bullets.length must be exactly ${bulletCount} (same order as the outline above).
- lead: max 240 characters; at most two sentences.
- English only.
- JSON shape: {"headline":"...","dek":"...","lead":"...","bullets":["...","..."]}`;

  return { system: SYSTEM, user };
}
