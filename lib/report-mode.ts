/** Values returned to the client for report provenance. */
export type ReportModeApi = "deterministic" | "openai" | "unknown";

/** Stored on `reports.report_mode` for new rows; null/legacy → unknown. */
export function toReportModeApi(stored: string | null | undefined): ReportModeApi {
  if (stored === "deterministic" || stored === "openai") return stored;
  return "unknown";
}

export function reportModeLabel(mode: ReportModeApi): string {
  switch (mode) {
    case "deterministic":
      return "Deterministic";
    case "openai":
      return "AI-polished (OpenAI)";
    default:
      return "Unknown";
  }
}
