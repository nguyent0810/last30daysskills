export type ResolvedThreadCompressionProvider =
  | { ok: true; kind: "hf"; token: string; model: string }
  | { ok: true; kind: "gemini"; apiKey: string; model: string }
  | { ok: false };

/**
 * Deploy-time provider selection only (V1). `AI_SUMMARY_PROVIDER` must be `hf` or `gemini`.
 * No env-key precedence; invalid or incomplete config => disabled.
 */
export function resolveThreadCompressionProvider(): ResolvedThreadCompressionProvider {
  const raw = process.env.AI_SUMMARY_PROVIDER?.trim();
  if (raw !== "hf" && raw !== "gemini") {
    return { ok: false };
  }

  if (raw === "hf") {
    const token = process.env.HUGGINGFACE_API_TOKEN?.trim();
    const model = process.env.HUGGINGFACE_MODEL?.trim();
    if (!token || !model) return { ok: false };
    return { ok: true, kind: "hf", token, model };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  if (!apiKey || !model) return { ok: false };
  return { ok: true, kind: "gemini", apiKey, model };
}

export function isThreadCompressionConfigured(): boolean {
  return resolveThreadCompressionProvider().ok;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

/**
 * Per-request Gemini using a user-supplied API key (header). Not persisted server-side.
 * Model id follows server `GEMINI_MODEL` when set, else the same default as `lib/ai/gemini-summary.ts`.
 */
export function resolveGeminiProviderFromUserKey(
  apiKey: string
): Extract<ResolvedThreadCompressionProvider, { ok: true }> | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return { ok: true, kind: "gemini", apiKey: trimmed, model };
}
