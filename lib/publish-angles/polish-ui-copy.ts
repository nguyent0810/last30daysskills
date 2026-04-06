type PolishUiErrorInput = {
  code?: string;
  error?: string;
};

export function mapPolishErrorToUi(input: PolishUiErrorInput): {
  message: string;
  details: string | null;
} {
  const raw = input.error?.trim() || "";
  const code = input.code ?? "";

  if (code === "AI_NOT_CONFIGURED") {
    return { message: "AI polish unavailable right now.", details: raw || null };
  }
  if (code === "AI_POLISH_BAD_OUTPUT") {
    return { message: "We could not polish this angle. Please try again.", details: raw || null };
  }
  if (code === "JOB_NOT_ELIGIBLE") {
    return { message: "This run is not eligible for AI polish.", details: raw || null };
  }
  if (code === "INVALID_OPPORTUNITY_INDEX" || code === "INVALID_BODY" || code === "INVALID_ANGLE_CITATIONS") {
    return { message: "Could not polish this card.", details: raw || null };
  }
  if (code === "HF_TIMEOUT" || code === "GEMINI_TIMEOUT") {
    return { message: "AI polish timed out. Please try again.", details: raw || null };
  }
  if (code === "HF_EMPTY" || code === "GEMINI_EMPTY") {
    return { message: "AI polish returned empty output. Please try again.", details: raw || null };
  }
  if (code.endsWith("_NETWORK")) {
    return { message: "Network issue while polishing. Please try again.", details: raw || null };
  }

  return {
    message: "Could not polish this angle. Please try again.",
    details: raw || null,
  };
}
