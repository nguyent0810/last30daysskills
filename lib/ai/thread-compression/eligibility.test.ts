import { describe, expect, it } from "vitest";
import { isThreadAiCompressionEligible } from "./eligibility";

describe("isThreadAiCompressionEligible", () => {
  it("is true when at least two runs", () => {
    expect(isThreadAiCompressionEligible(2, 10)).toBe(true);
  });

  it("is true when brief longer than 600 chars", () => {
    expect(isThreadAiCompressionEligible(1, 601)).toBe(true);
  });

  it("is false for single short brief", () => {
    expect(isThreadAiCompressionEligible(1, 600)).toBe(false);
  });
});
