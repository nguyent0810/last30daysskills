import { describe, expect, it } from "vitest";
import { reportModeLabel, toReportModeApi } from "./report-mode";

describe("toReportModeApi", () => {
  it("maps stored values", () => {
    expect(toReportModeApi("deterministic")).toBe("deterministic");
    expect(toReportModeApi("openai")).toBe("openai");
  });

  it("maps null and unknown strings to unknown", () => {
    expect(toReportModeApi(null)).toBe("unknown");
    expect(toReportModeApi(undefined)).toBe("unknown");
    expect(toReportModeApi("")).toBe("unknown");
  });
});

describe("reportModeLabel", () => {
  it("returns readable labels", () => {
    expect(reportModeLabel("deterministic")).toBe("Deterministic");
    expect(reportModeLabel("openai")).toContain("OpenAI");
    expect(reportModeLabel("unknown")).toBe("Unknown");
  });
});
