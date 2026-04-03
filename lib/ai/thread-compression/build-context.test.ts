import { describe, expect, it } from "vitest";
import { buildThreadCompressionContext } from "./build-context";

describe("buildThreadCompressionContext", () => {
  it("appends CONTEXT TRUNCATED when over 4000 chars", () => {
    const hugeBrief = "x".repeat(5000);
    const out = buildThreadCompressionContext({
      topic: "t",
      displayTitle: null,
      threadInsight: null,
      briefText: hugeBrief,
      runs: [],
    });
    expect(out.length).toBeLessThanOrEqual(4000);
    expect(out.endsWith("\n[CONTEXT TRUNCATED]")).toBe(true);
  });

  it("includes recent runs newest-first up to three", () => {
    const out = buildThreadCompressionContext({
      topic: "Topic",
      displayTitle: null,
      threadInsight: {
        summaryLine: "Signal",
        direction: "flat",
        sourceDominance: "mixed",
      },
      briefText: "Brief line",
      runs: [
        {
          id: "a",
          status: "done",
          createdAt: "2025-01-03T00:00:00.000Z",
          updatedAt: "2025-01-03T00:00:00.000Z",
          reportMode: "deterministic",
          insightLine: "latest insight",
          vsPreviousLine: "vs prior",
        },
        {
          id: "b",
          status: "done",
          createdAt: "2025-01-02T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
          reportMode: "deterministic",
          insightLine: "older",
          vsPreviousLine: null,
        },
      ],
    });
    expect(out).toContain("Recent runs");
    expect(out).toContain("latest insight");
    expect(out.indexOf("latest insight")).toBeLessThan(out.indexOf("older"));
  });
});
