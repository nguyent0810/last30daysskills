import { truncateCompressionOutput } from "./truncate-output";
import type { CompressionResult } from "./types";
import { callGeminiThreadCompression } from "./providers/gemini";
import { callHfThreadCompression } from "./providers/hf";
import type { ResolvedThreadCompressionProvider } from "./select";

export async function runThreadCompression(
  system: string,
  user: string,
  provider: Extract<ResolvedThreadCompressionProvider, { ok: true }>,
  fetchImpl?: typeof fetch
): Promise<CompressionResult> {
  const fn = fetchImpl ?? globalThis.fetch;
  let raw: CompressionResult;
  if (provider.kind === "hf") {
    raw = await callHfThreadCompression(system, user, provider.token, provider.model, fn);
  } else {
    raw = await callGeminiThreadCompression(system, user, provider.apiKey, provider.model, fn);
  }

  if (!raw.ok) return raw;
  return { ok: true, text: truncateCompressionOutput(raw.text) };
}
