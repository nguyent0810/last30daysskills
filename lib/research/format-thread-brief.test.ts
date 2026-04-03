import { describe, expect, it } from "vitest";
import { buildThreadBriefText, pickWhatChangedLine } from "./format-thread-brief";

const insight = {
  summaryLine: "Latest run is mixed sources; activity looks stronger than your last run.",
  direction: "rising" as const,
  sourceDominance: "mixed" as const,
};

describe("pickWhatChangedLine", () => {
  it("returns first non-empty vsPreviousLine scanning latest-first", () => {
    expect(
      pickWhatChangedLine([
        { vsPreviousLine: "   " },
        { vsPreviousLine: "More Reddit activity than the previous run" },
      ])
    ).toBe("More Reddit activity than the previous run");
  });

  it("uses latest when present", () => {
    expect(
      pickWhatChangedLine([
        { vsPreviousLine: "Latest delta" },
        { vsPreviousLine: "Older delta" },
      ])
    ).toBe("Latest delta");
  });

  it("returns null when all empty", () => {
    expect(pickWhatChangedLine([{ vsPreviousLine: null }, { vsPreviousLine: "" }])).toBeNull();
  });
});

describe("buildThreadBriefText", () => {
  it("builds full brief with insight and note", () => {
    const t = buildThreadBriefText({
      displayTitle: "My label",
      topic: "Canonical topic",
      note: "Watch for momentum",
      threadInsight: insight,
      runs: [{ vsPreviousLine: "No major change since the previous run." }],
    });
    expect(t).toContain("Title: My label");
    expect(t).toContain("Topic: Canonical topic");
    expect(t).toContain("Current signal: Latest run is mixed");
    expect(t).toContain("Direction: Rising");
    expect(t).toContain("Source dominance: Mixed");
    expect(t).toContain("What changed: No major change");
    expect(t).toContain("Why this matters:");
    expect(t).toContain("Watch for momentum");
  });

  it("uses topic as title when displayTitle empty", () => {
    const t = buildThreadBriefText({
      displayTitle: null,
      topic: "EU AI Act",
      note: null,
      threadInsight: insight,
      runs: [{ vsPreviousLine: "x" }],
    });
    expect(t).toContain("Title: EU AI Act");
  });

  it("uses placeholders when no insight", () => {
    const t = buildThreadBriefText({
      displayTitle: null,
      topic: "T",
      note: null,
      threadInsight: null,
      runs: [],
    });
    expect(t).toContain("Current signal: No signal yet");
    expect(t).toContain("Direction: Not enough data yet");
    expect(t).toContain("Source dominance: Not enough data yet");
    expect(t).toContain("What changed: No previous run to compare");
  });

  it("omits note block when note empty", () => {
    const t = buildThreadBriefText({
      displayTitle: null,
      topic: "T",
      note: "  ",
      threadInsight: insight,
      runs: [{ vsPreviousLine: "Delta" }],
    });
    expect(t).not.toContain("Why this matters:");
  });

  it("falls back what changed when no delta lines", () => {
    const t = buildThreadBriefText({
      displayTitle: null,
      topic: "T",
      note: null,
      threadInsight: insight,
      runs: [{ vsPreviousLine: null }, { vsPreviousLine: "" }],
    });
    expect(t).toContain("What changed: No previous run to compare");
  });
});
