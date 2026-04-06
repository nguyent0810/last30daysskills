import { describe, expect, it } from "vitest";
import { sanitizeWorkingTitleForDisplay } from "./sanitize-working-title";

describe("sanitizeWorkingTitleForDisplay", () => {
  it("strips bold markers and trailing hn score (real-run shape)", () => {
    const before =
      "**Write a mini-Redis in Rust: learn async programming with Tokio** (hn, score 0.87)";
    expect(sanitizeWorkingTitleForDisplay(before)).toBe(
      "Write a mini-Redis in Rust: learn async programming with Tokio"
    );
  });

  it("strips reddit score fragment", () => {
    const before = "**Grok is RIP.. any methods?** (reddit, score 0.96)";
    expect(sanitizeWorkingTitleForDisplay(before)).toBe("Grok is RIP.. any methods?");
  });

  it("strips polymarket score fragment", () => {
    const before = "**Will Airbnb begin publicly trading before Jan 1, 2021?** (polymarket, score 0.42)";
    expect(sanitizeWorkingTitleForDisplay(before)).toBe(
      "Will Airbnb begin publicly trading before Jan 1, 2021?"
    );
  });

  it("leaves titles without report suffix unchanged (aside from **)", () => {
    expect(sanitizeWorkingTitleForDisplay("EU Approves AI Act")).toBe("EU Approves AI Act");
  });

  it("normalizes whitespace after stripping", () => {
    expect(sanitizeWorkingTitleForDisplay("  **A**  (hn, score 1)  ")).toBe("A");
  });
});
