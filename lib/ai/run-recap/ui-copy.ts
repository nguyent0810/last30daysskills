type RecapUiErrorInput = {
  code?: string;
  error?: string;
};

export function recapProviderStateLabel(serverAiConfigured: boolean): string {
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

  if (code === "AI_NOT_CONFIGURED") {
    return { message: "AI recap unavailable right now.", details: raw || null };
  }
  if (code === "AI_RECAP_BAD_OUTPUT") {
    return { message: "We could not generate a useful recap this time. Please try again.", details: raw || null };
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

