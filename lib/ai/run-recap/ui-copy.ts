type RecapUiErrorInput = {
  code?: string;
  error?: string;
  usingGeminiKey: boolean;
};

export function recapProviderStateLabel(
  usingGeminiKey: boolean,
  serverAiConfigured: boolean
): string {
  if (usingGeminiKey) return "Using your Gemini key";
  if (serverAiConfigured) return "Using server AI";
  return "AI recap unavailable";
}

export function mapRecapErrorToUi(input: RecapUiErrorInput): {
  message: string;
  details: string | null;
} {
  const raw = input.error?.trim() || "";
  const code = input.code ?? "";
  const haystack = `${code} ${raw}`.toLowerCase();

  if (
    input.usingGeminiKey &&
    (haystack.includes("quota") ||
      haystack.includes("usage limit") ||
      haystack.includes("rate limit") ||
      haystack.includes("resource exhausted") ||
      haystack.includes("429"))
  ) {
    return {
      message: "Your Gemini key hit its usage limit. Try again later or clear it to use server AI.",
      details: raw || null,
    };
  }

  if (code === "AI_NOT_CONFIGURED") {
    return { message: "AI recap unavailable right now.", details: raw || null };
  }
  if (code === "JOB_NOT_ELIGIBLE") {
    return { message: "This run is not ready for AI recap yet.", details: raw || null };
  }
  if (code === "HF_TIMEOUT" || code === "GEMINI_TIMEOUT") {
    return { message: "AI recap timed out. Please try again.", details: raw || null };
  }
  if (code === "HF_EMPTY" || code === "GEMINI_EMPTY") {
    return { message: "AI recap returned empty output. Please try again.", details: raw || null };
  }
  if (code.endsWith("_NETWORK")) {
    return { message: "Network issue while generating recap. Please try again.", details: raw || null };
  }

  return {
    message: "Could not generate AI recap. Please try again.",
    details: raw || null,
  };
}

