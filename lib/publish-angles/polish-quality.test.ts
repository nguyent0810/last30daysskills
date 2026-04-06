import { describe, expect, it } from "vitest";
import {
  isPolishOutputAcceptable,
  polishMinimalChangeNote,
  sanitizePolishModelFields,
  stripUrlLikeSequences,
} from "./polish-quality";
import { POLISH_LEAD_MAX_CHARS } from "./polish-schema";

describe("stripUrlLikeSequences", () => {
  it("removes https URLs", () => {
    expect(stripUrlLikeSequences("See https://x.com/y for more")).toBe("See for more");
  });
});

describe("sanitizePolishModelFields", () => {
  it("truncates lead over max", () => {
    const long = "a".repeat(POLISH_LEAD_MAX_CHARS + 20);
    const out = sanitizePolishModelFields({
      headline: "h",
      dek: "dek line long enough",
      lead: long,
      bullets: ["bullet one ok", "bullet two ok"],
    });
    expect(out.lead.length).toBeLessThanOrEqual(POLISH_LEAD_MAX_CHARS);
  });
});

describe("isPolishOutputAcceptable", () => {
  it("passes good output", () => {
    expect(
      isPolishOutputAcceptable({
        headline: "Good headline",
        dek: "Good dek line here",
        lead: "Good lead sentence here.",
        bullets: ["First bullet text ok", "Second bullet text ok"],
        expectedBulletCount: 2,
      })
    ).toBe(true);
  });

  it("fails wrong bullet count", () => {
    expect(
      isPolishOutputAcceptable({
        headline: "Good headline",
        dek: "Good dek line here",
        lead: "Good lead sentence here.",
        bullets: ["one"],
        expectedBulletCount: 2,
      })
    ).toBe(false);
  });

  it("fails lead too long", () => {
    expect(
      isPolishOutputAcceptable({
        headline: "Good headline",
        dek: "Good dek line here",
        lead: "x".repeat(POLISH_LEAD_MAX_CHARS + 1),
        bullets: ["First bullet text ok"],
        expectedBulletCount: 1,
      })
    ).toBe(false);
  });
});

describe("polishMinimalChangeNote", () => {
  it("returns minimal_change when identical fingerprint", () => {
    expect(
      polishMinimalChangeNote("Same", "Dek", ["a", "b"], {
        headline: "Same",
        dek: "Dek",
        bullets: ["a", "b"],
      })
    ).toBe("minimal_change");
  });

  it("returns undefined when clearly different", () => {
    expect(
      polishMinimalChangeNote("Alpha", "Dek", ["x"], {
        headline: "Beta gamma delta",
        dek: "Dek",
        bullets: ["y"],
      })
    ).toBeUndefined();
  });
});
