export type ResolvedThreadCompressionProvider =
  | { ok: true; kind: "hf"; token: string; model: string }
  | { ok: true; kind: "gemini"; apiKey: string; model: string }
  | { ok: false };

/**
 * Provider resolution for recap/compression.
 * - If `AI_SUMMARY_PROVIDER` is explicitly `hf` or `gemini`, respect that choice.
 * - Otherwise, use free-first fallback: HF if configured, else Gemini if configured.
 */
export function resolveThreadCompressionProvider(): ResolvedThreadCompressionProvider {
  const hfToken = process.env.HUGGINGFACE_API_TOKEN?.trim();
  const hfModel = process.env.HUGGINGFACE_MODEL?.trim();
  const hfConfigured = Boolean(hfToken && hfModel);

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL?.trim();
  const geminiConfigured = Boolean(geminiApiKey && geminiModel);

  const explicit = process.env.AI_SUMMARY_PROVIDER?.trim();
  if (explicit === "hf") {
    if (!hfConfigured) return { ok: false };
    return { ok: true, kind: "hf", token: hfToken!, model: hfModel! };
  }
  if (explicit === "gemini") {
    if (!geminiConfigured) return { ok: false };
    return { ok: true, kind: "gemini", apiKey: geminiApiKey!, model: geminiModel! };
  }

  // Free-first fallback when provider env is missing/invalid.
  if (hfConfigured) return { ok: true, kind: "hf", token: hfToken!, model: hfModel! };
  if (geminiConfigured) return { ok: true, kind: "gemini", apiKey: geminiApiKey!, model: geminiModel! };
  return { ok: false };
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
