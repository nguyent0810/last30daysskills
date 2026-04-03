import { languageInstruction, resolveOutputLanguage, type OutputLanguageKind } from "../thread-compression/language-hint";

const SYSTEM = `Compression-only: you compress a single research run into a short reader-facing recap.

Rules:
- Use ONLY information in the context. Do not invent sources, URLs, or facts.
- Output exactly 2–4 sentences. Plain text only. No bullet lists.
- Do not use markdown.
- Follow the output language instruction exactly.`;

/**
 * Builds prompts for run recap (Phase C). Compression-only.
 */
export function buildRunRecapPrompts(
  topic: string,
  displayTitle: string | null | undefined,
  contextBlock: string
): { system: string; user: string; languageKind: OutputLanguageKind } {
  const kind = resolveOutputLanguage(topic, displayTitle, contextBlock);
  const langLine = languageInstruction(kind);

  const user = `${langLine}

--- Run context ---
${contextBlock}
--- End context ---

Produce the compressed recap now (2–4 sentences only).`;

  return { system: SYSTEM, user, languageKind: kind };
}

