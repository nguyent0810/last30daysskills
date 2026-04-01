/**
 * Optional OpenAI pass for the final markdown report only.
 * Deterministic pipeline output is the single source of facts; no planning/search calls.
 */

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM = `You are a careful editor. You receive a single markdown document that was produced deterministically from ranked, deduplicated source items. Your task is to rewrite it into a clear, readable final report in Markdown.

You MUST:
- Use only information and URLs present in the provided document; do not add facts, sources, or links that are not implied by that text.
- Do not perform web search or claim access to external data.
- Preserve the substantive meaning and ordering of evidence (top items stay prominent).

You MAY:
- Reorganize sections, add headings, improve phrasing, and tighten formatting.`;

function buildUserMessage(topic: string, deterministicMarkdown: string): string {
  return `Research topic: ${topic}

Below is the deterministic markdown to synthesize. Rewrite it as the final report.

---BEGIN DETERMINISTIC MARKDOWN---
${deterministicMarkdown}
---END---
`;
}

export type SynthesizeOptions = {
  /** Defaults to process.env.OPENAI_API_KEY */
  apiKey?: string;
  /** Defaults to process.env.OPENAI_MODEL ?? gpt-4o-mini */
  model?: string;
  /** For tests; defaults to global fetch */
  fetchImpl?: typeof fetch;
};

export type SynthesizeReportResult = {
  markdown: string;
  /** OpenAI succeeded and returned content different path from fallback-only. */
  mode: "deterministic" | "openai";
};

/**
 * Returns OpenAI-polished markdown when configured and successful; otherwise deterministic markdown.
 */
export async function synthesizeReportWithOpenAI(
  topic: string,
  deterministicMarkdown: string,
  options?: SynthesizeOptions
): Promise<SynthesizeReportResult> {
  const apiKey = (options?.apiKey ?? process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) {
    return { markdown: deterministicMarkdown, mode: "deterministic" };
  }

  const model = (options?.model ?? process.env.OPENAI_MODEL)?.trim() || DEFAULT_MODEL;
  const fetchFn = options?.fetchImpl ?? globalThis.fetch;

  try {
    const res = await fetchFn("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserMessage(topic, deterministicMarkdown) },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(
        `[synthesizeReportWithOpenAI] OpenAI HTTP ${res.status}; using deterministic report`
      );
      return { markdown: deterministicMarkdown, mode: "deterministic" };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.warn("[synthesizeReportWithOpenAI] empty model content; using deterministic report");
      return { markdown: deterministicMarkdown, mode: "deterministic" };
    }

    return { markdown: content, mode: "openai" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[synthesizeReportWithOpenAI] ${msg}; using deterministic report`);
    return { markdown: deterministicMarkdown, mode: "deterministic" };
  }
}
