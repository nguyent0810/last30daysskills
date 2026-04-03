import { describe, expect, it } from "vitest";
import { insightLineFromReport } from "./run-insight-line";

describe("insightLineFromReport", () => {
  it("returns null for empty", () => {
    expect(insightLineFromReport(null)).toBeNull();
    expect(insightLineFromReport("")).toBeNull();
    expect(insightLineFromReport("   ")).toBeNull();
  });

  it("picks a substantive line from markdown", () => {
    const md = `## Top findings\n\n1. First finding is long enough to be useful for previews.\n2. Second.\n`;
    const line = insightLineFromReport(md);
    expect(line).toContain("First finding");
  });

  it("truncates long lines", () => {
    const long = "x".repeat(200);
    const line = insightLineFromReport(long, 50);
    expect(line!.length).toBeLessThanOrEqual(50);
    expect(line!.endsWith("…")).toBe(true);
  });
});
