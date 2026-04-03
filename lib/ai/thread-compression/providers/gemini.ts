import type { CompressionResult } from "../types";

const REQUEST_TIMEOUT_MS = 20_000;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function callGeminiThreadCompression(
  system: string,
  user: string,
  apiKey: string,
  model: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<CompressionResult> {
  const url = `${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1024,
        },
      }),
    });

    const rawText = await res.text();
    let data: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      data = {};
    }

    if (!res.ok) {
      const errText = data.error?.message ?? rawText.slice(0, 200);
      return {
        ok: false,
        code: "GEMINI_HTTP",
        message: `Gemini API error (${res.status})${errText ? `: ${errText}` : ""}`,
      };
    }

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
    if (msg.includes("abort") || e instanceof DOMException) {
      return { ok: false, code: "GEMINI_TIMEOUT", message: "Summary request timed out" };
    }
    return { ok: false, code: "GEMINI_NETWORK", message: msg };
  } finally {
    clearTimeout(timer);
  }
}
