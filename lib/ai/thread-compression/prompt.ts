import { languageInstruction, resolveOutputLanguage, type OutputLanguageKind } from "./language-hint";

const SYSTEM = `You compress research thread context into a short reader-facing summary.

Rules:
- Use ONLY information in the context. Do not invent sources, URLs, or facts.
- Output exactly 2–4 sentences. Plain text only. No bullet lists unless one sentence needs it.
- Answer implicitly: what is happening, the strongest signal, what changed, what matters now.
- Follow the output language instruction exactly.`;

export function buildCompressionPrompts(
  topic: string,
  displayTitle: string | null | undefined,
  contextBlock: string
): { system: string; user: string; languageKind: OutputLanguageKind } {
  const kind = resolveOutputLanguage(topic, displayTitle, contextBlock);
  const langLine = languageInstruction(kind);
  const user = `${langLine}

--- Thread context ---
${contextBlock}
--- End context ---

Produce the compressed summary now (2–4 sentences only).`;

  return { system: SYSTEM, user, languageKind: kind };
}
