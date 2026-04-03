import type { CompressionResult } from "../types";

const REQUEST_TIMEOUT_MS = 20_000;
const HF_URL = (model: string) =>
  `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;

function parseHfOutput(data: unknown): string | null {
  if (typeof data === "string") return data.trim() || null;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as { generated_text?: string; summary_text?: string };
    const t = first.generated_text ?? first.summary_text;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  if (data && typeof data === "object") {
    const o = data as { generated_text?: string; summary_text?: string; [k: string]: unknown };
    if (typeof o.generated_text === "string" && o.generated_text.trim()) return o.generated_text.trim();
    if (typeof o.summary_text === "string" && o.summary_text.trim()) return o.summary_text.trim();
  }
  return null;
}

export async function callHfThreadCompression(
  system: string,
  user: string,
  token: string,
  model: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<CompressionResult> {
  const inputs = `${system}\n\n${user}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(HF_URL(model), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        parameters: {
          max_new_tokens: 320,
          return_full_text: false,
        },
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
      const errMsg =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : rawText.slice(0, 200);
      return {
        ok: false,
        code: "HF_HTTP",
        message: `Hugging Face error (${res.status})${errMsg ? `: ${errMsg}` : ""}`,
      };
    }

    const text = parseHfOutput(data);
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
