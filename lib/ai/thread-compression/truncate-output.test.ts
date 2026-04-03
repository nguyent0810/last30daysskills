import { describe, expect, it } from "vitest";
import { truncateCompressionOutput } from "./truncate-output";

describe("truncateCompressionOutput", () => {
  it("returns text unchanged under cap", () => {
    expect(truncateCompressionOutput("hello")).toBe("hello");
  });

  it("truncates to 1200 chars with ellipsis", () => {
    const long = "a".repeat(1300);
    const out = truncateCompressionOutput(long);
    expect(out.length).toBe(1200);
    expect(out.endsWith("…")).toBe(true);
  });
});
