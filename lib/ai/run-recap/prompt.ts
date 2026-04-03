export type RecapLanguage = "en" | "ja" | "vi";

const SYSTEM = `You write a grounded recap for a single research run.

Rules:
- Use ONLY information in the context. Do not invent sources, URLs, or facts.
- Stay close to what the findings actually are (dataset type, dominant source(s), topic clusters, temporal skew if visible).
- If relevance to the query looks weak/noisy/indirect, say that explicitly.
- Avoid broad interpretation beyond provided findings.
- Keep output concise and structured. Do not write an essay.

Output must be grounded in the run evidence and avoid broad framing not supported by the findings.`;

function languageInstruction(kind: RecapLanguage): string {
  if (kind === "ja") return "Write your entire response in Japanese.";
  if (kind === "vi") return "Write your entire response in Vietnamese.";
  return "Write your entire response in English.";
}

function sectionTemplate(kind: RecapLanguage): string {
  if (kind === "ja") {
    return `出力形式（見出しをそのまま使用）:
要約:
主要テーマ:
- ...
具体例:
- ...
示唆:
...`;
  }
  if (kind === "vi") {
    return `Định dạng đầu ra (dùng đúng tiêu đề):
Tóm tắt:
Chủ đề chính:
- ...
Ví dụ:
- ...
Kết luận:
...`;
  }
  return `Output format (use exact headings):
Summary:
Main themes:
- ...
Examples:
- ...
Takeaway:
...`;
}

/**
 * Builds prompts for run recap with grounded, structured output.
 */
export function buildRunRecapPrompts(
  topic: string,
  displayTitle: string | null | undefined,
  contextBlock: string,
  language: RecapLanguage = "en"
): { system: string; user: string; language: RecapLanguage } {
  const langLine = languageInstruction(language);
  const titleLine = displayTitle?.trim() ? `Display title: ${displayTitle?.trim()}\n` : "";
  const template = sectionTemplate(language);
  const user = `${langLine}
Topic: ${topic}
${titleLine}
--- Run context ---
${contextBlock}
--- End context ---

${template}

Grounding requirements:
- In the first line of the summary, state what the result set actually is and the dominant source(s).
- Mention temporal skew if it is obvious (e.g. mostly from one year/time period).
- Main themes: 3-5 concise bullets, only from observed findings.
- Examples: 2-4 concrete examples from provided items/report.
- In takeaway, explicitly say if relevance to the query appears weak/noisy/indirect.
- Keep concise; no generic essay tone.`;

  return { system: SYSTEM, user, language };
}

