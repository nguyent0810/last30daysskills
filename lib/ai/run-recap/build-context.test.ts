import { describe, expect, it } from "vitest";
import { buildRunRecapContext } from "./build-context";

describe("buildRunRecapContext", () => {
  it("includes Topic + Run status + Report mode and omits Display title when missing", () => {
    const ctx = buildRunRecapContext({
      topic: "EU AI Act",
      displayTitle: null,
      jobStatus: "succeeded",
      reportMode: "deterministic",
      reportMarkdown: "Report body here.",
      items: [
        { source: "hn", title: "A", snippet: "Snippet A" },
        { source: "reddit", title: "B", snippet: "Snippet B" },
      ],
    });

    expect(ctx).toContain("Topic: EU AI Act");
    expect(ctx).not.toContain("Display title:");
    expect(ctx).toContain("Run status: succeeded");
    expect(ctx).toContain("Report mode: deterministic");
  });

  it("caps top items to 4 and formats each item with Source/Title/Snippet", () => {
    const snippet = "x".repeat(220);
    const ctx = buildRunRecapContext({
      topic: "EU AI Act",
      displayTitle: "EU AI Act (label)",
      jobStatus: "succeeded",
      reportMode: "deterministic",
      reportMarkdown: "Report body here.",
      items: [
        { source: "hn", title: "T1", snippet },
        { source: "reddit", title: "T2", snippet: snippet + "2" },
        { source: "polymarket", title: "T3", snippet: snippet + "3" },
        { source: "hn", title: "T4", snippet: snippet + "4" },
        { source: "reddit", title: "T5", snippet: "SHOULD NOT SHOW" },
      ],
    });

    expect(ctx).toContain("Display title: EU AI Act (label)");
    expect(ctx).toContain("- Source: hn | Title: T1");
    expect(ctx).toContain("- Source: reddit | Title: T2");
    expect(ctx).toContain("- Source: polymarket | Title: T3");
    expect(ctx).toContain("- Source: hn | Title: T4");
    expect(ctx).not.toContain("T5");

    // Snippet is trimmed to <= 160 chars (extract the snippet payload length)
    const snips = [...ctx.matchAll(/Snippet: (.*)$/gm)].map((m) => m[1] ?? "");
    expect(snips.length).toBeGreaterThanOrEqual(4);
    for (const s of snips.slice(0, 4)) {
      expect(s.length).toBeLessThanOrEqual(160);
      expect(s).toBe(snippet.slice(0, 160));
    }
  });

  it("caps total context to 4000 chars and appends [CONTEXT TRUNCATED] marker", () => {
    const ctx = buildRunRecapContext({
      topic: "Some topic",
      displayTitle: null,
      jobStatus: "succeeded",
      reportMode: "unknown",
      reportMarkdown: "R".repeat(6000),
      items: [],
    });

    expect(ctx.length).toBeLessThanOrEqual(4000);
    expect(ctx.endsWith("[CONTEXT TRUNCATED]")).toBe(true);
  });
});

