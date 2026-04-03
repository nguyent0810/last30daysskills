import { describe, expect, it } from "vitest";
import {
  buildThreadInsight,
  deriveDirection,
  deriveSourceDominance,
  deriveVsPreviousLine,
  sourceStatsFromSourceRunRows,
} from "./thread-insight";

describe("sourceStatsFromSourceRunRows", () => {
  it("sums by source", () => {
    expect(
      sourceStatsFromSourceRunRows([
        { source: "hn", itemCount: 3 },
        { source: "reddit", itemCount: 10 },
        { source: "polymarket", itemCount: 1 },
      ])
    ).toEqual({ hn: 3, reddit: 10, polymarket: 1, total: 14 });
  });
});

describe("deriveSourceDominance", () => {
  it("returns weak when total is tiny", () => {
    expect(deriveSourceDominance({ hn: 1, reddit: 1, polymarket: 0, total: 2 })).toBe("weak");
  });

  it("detects Reddit-heavy", () => {
    expect(deriveSourceDominance({ hn: 2, reddit: 12, polymarket: 1, total: 15 })).toBe("reddit");
  });

  it("detects HN-heavy", () => {
    expect(deriveSourceDominance({ hn: 14, reddit: 3, polymarket: 2, total: 19 })).toBe("hacker_news");
  });
});

describe("deriveDirection", () => {
  it("sparse when latest total very low", () => {
    expect(deriveDirection({ hn: 0, reddit: 2, polymarket: 0, total: 2 }, { hn: 5, reddit: 5, polymarket: 0, total: 10 }, 2)).toBe(
      "sparse"
    );
  });

  it("rising when clear growth", () => {
    expect(deriveDirection({ hn: 10, reddit: 10, polymarket: 0, total: 20 }, { hn: 5, reddit: 5, polymarket: 0, total: 10 }, 2)).toBe(
      "rising"
    );
  });

  it("fading when prior strong and latest drops", () => {
    expect(deriveDirection({ hn: 2, reddit: 2, polymarket: 0, total: 4 }, { hn: 8, reddit: 8, polymarket: 0, total: 16 }, 2)).toBe(
      "fading"
    );
  });
});

describe("deriveVsPreviousLine", () => {
  it("describes broader sources", () => {
    const line = deriveVsPreviousLine(
      { hn: 2, reddit: 2, polymarket: 1, total: 5 },
      { hn: 5, reddit: 0, polymarket: 0, total: 5 }
    );
    expect(line).toContain("more sources");
  });

  it("flat when similar", () => {
    const line = deriveVsPreviousLine(
      { hn: 3, reddit: 3, polymarket: 0, total: 6 },
      { hn: 3, reddit: 3, polymarket: 0, total: 6 }
    );
    expect(line).toContain("No major change");
  });
});

describe("buildThreadInsight", () => {
  it("handles single run", () => {
    const t = buildThreadInsight({ hn: 2, reddit: 8, polymarket: 0, total: 10 }, null, 1);
    expect(t.sourceDominance).toBe("reddit");
    expect(t.summaryLine).toMatch(/First run/i);
  });

  it("avoids stacked thin/light copy when latest is sparse and weak (2+ runs)", () => {
    const t = buildThreadInsight({ hn: 1, reddit: 1, polymarket: 1, total: 3 }, { hn: 8, reddit: 6, polymarket: 2, total: 16 }, 2);
    expect(t.direction).toBe("sparse");
    expect(t.sourceDominance).toBe("weak");
    expect(t.summaryLine).toMatch(/very light/i);
    expect(t.summaryLine).not.toMatch(/thin signal.*light signal/s);
  });
});
