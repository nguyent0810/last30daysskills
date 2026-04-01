/**
 * Transient Gemini summary over existing research only (no web search, no persistence).
 */

export type GeminiSummaryStyle = "short" | "bullets" | "executive";

export type ResearchItemLine = {
  source: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
};

const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_REPORT_CHARS = 14_000;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM = `You are a careful analyst. You receive a research topic, an existing markdown report, and a list of top research items (titles, snippets, URLs). Your task is to produce ONE summary for the user.

Rules:
- Use ONLY the information provided. Do not search the web or invent facts, sources, or URLs.
- If the material is thin, say so briefly and still summarize what is there.
- Follow the user's requested output language and style exactly.
- Output plain text or markdown matching the style (bullets may use markdown lists).`;

function truncateReport(s: string): string {
  if (s.length <= MAX_REPORT_CHARS) return s;
  return `${s.slice(0, MAX_REPORT_CHARS)}\n\n[Report truncated for length.]`;
}

function styleInstructions(style: GeminiSummaryStyle): string {
  switch (style) {
    case "short":
      return "Style: 2–4 tight paragraphs. No bullet list unless essential.";
    case "bullets":
      return "Style: Use markdown bullet list for key points. Keep each bullet concise.";
    case "executive":
      return "Style: Executive brief — opening line with bottom line, then 3–5 labeled sections (##) with short paragraphs.";
    default:
      return "Style: Clear and concise.";
  }
}

export function buildGeminiUserText(
  topic: string,
  reportMarkdown: string,
  items: ResearchItemLine[],
  languageCode: string,
  style: GeminiSummaryStyle
): string {
  const lines = items.map(
    (it, i) =>
      `${i + 1}. [${it.source}] ${it.title} (score ${it.score.toFixed(2)})\n   URL: ${it.url}\n   ${it.snippet.slice(0, 280)}${it.snippet.length > 280 ? "…" : ""}`
  );
  return `Output language (ISO-like code): ${languageCode}
${styleInstructions(style)}

Research topic:
${topic}

--- Existing report (markdown) ---
${truncateReport(reportMarkdown)}
--- End report ---

Top research items (highest score first):
${lines.length ? lines.join("\n\n") : "(No items stored.)"}

Produce the summary now.`;
}

export type GeminiCallOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

export type GeminiCallResult =
  | { ok: true; text: string }
  | { ok: false; code: "GEMINI_NOT_CONFIGURED" | "GEMINI_HTTP" | "GEMINI_EMPTY" | "GEMINI_NETWORK"; message: string };

/**
 * Calls Google AI generateContent. No DB; caller handles auth and job ownership.
 */
export async function callGeminiGenerateSummary(
  userText: string,
  options?: GeminiCallOptions
): Promise<GeminiCallResult> {
  const apiKey = (options?.apiKey ?? process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    return { ok: false, code: "GEMINI_NOT_CONFIGURED", message: "Gemini API key not configured" };
  }

  const model = (options?.model ?? process.env.GEMINI_MODEL)?.trim() || DEFAULT_MODEL;
  const fetchFn = options?.fetchImpl ?? globalThis.fetch;
  const url = `${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM }],
        },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        code: "GEMINI_HTTP",
        message: `Gemini API error (${res.status})${errText ? `: ${errText.slice(0, 200)}` : ""}`,
      };
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      return { ok: false, code: "GEMINI_HTTP", message: data.error.message };
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")?.trim();
    if (!text) {
      return { ok: false, code: "GEMINI_EMPTY", message: "No summary text returned" };
    }

    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: "GEMINI_NETWORK", message: msg };
  }
}
