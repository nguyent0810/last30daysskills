import type { CompressionResult } from "../types";

const REQUEST_TIMEOUT_MS = 20_000;
/** Inference Providers (replaces deprecated api-inference.huggingface.co). */
const HF_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";

function parseHfChatOutput(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const c = o.choices?.[0]?.message?.content;
  if (typeof c === "string" && c.trim()) return c.trim();
  return null;
}

export async function callHfThreadCompression(
  system: string,
  user: string,
  token: string,
  model: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<CompressionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(HF_CHAT_COMPLETIONS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 320,
        temperature: 0.25,
      }),
    });

    const rawText = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      data = null;
    }

    if (!res.ok) {
      let errMsg = rawText.slice(0, 200);
      if (data && typeof data === "object") {
        const top = data as { error?: unknown; message?: string };
        if (typeof top.message === "string") errMsg = top.message;
        else if (top.error !== undefined) errMsg = String(top.error);
      }
      return {
        ok: false,
        code: "HF_HTTP",
        message: `Hugging Face error (${res.status})${errMsg ? `: ${errMsg}` : ""}`,
      };
    }

    const text = parseHfChatOutput(data);
    if (!text) {
      return { ok: false, code: "HF_EMPTY", message: "No summary text returned from the model" };
    }

    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || e instanceof DOMException) {
      return { ok: false, code: "HF_TIMEOUT", message: "Summary request timed out" };
    }
    return { ok: false, code: "HF_NETWORK", message: msg };
  } finally {
    clearTimeout(timer);
  }
}
