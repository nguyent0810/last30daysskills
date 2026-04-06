import { describe, expect, it } from "vitest";
import { buildPublishAnglesPhase1 } from "./build-phase1";
import { PUBLISH_ANGLES_PHASE1 } from "./constants";
import type { PublishAnglesItemInput, PublishAnglesSourceRunInput } from "./types";

function item(p: Partial<PublishAnglesItemInput> & Pick<PublishAnglesItemInput, "title" | "url">): PublishAnglesItemInput {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    snippet: "",
    score: 1,
    source: "hn",
    ...p,
  };
}

const runsOk = (counts: Record<string, number>): PublishAnglesSourceRunInput[] =>
  ["hn", "reddit", "polymarket"].map((source) => ({
    source,
    status: "succeeded",
    itemCount: counts[source] ?? 0,
  }));

describe("buildPublishAnglesPhase1", () => {
  it("returns items-led when no findings section", () => {
    const items = [
      item({ title: "Rust async book", url: "https://a.test/1", snippet: "tutorial async rust", score: 10 }),
      item({ title: "Discussion thread", url: "https://a.test/2", snippet: "opinions", score: 5 }),
    ];
    const r = buildPublishAnglesPhase1({
      reportMarkdown: "# No standard section\n\nHello.",
      items,
      sourceRuns: runsOk({ hn: 2, reddit: 1, polymarket: 0 }),
      jobTopic: "Rust async",
    });
    expect(r.derivation).toBe("items-led");
    expect(r.opportunities).toHaveLength(2);
    expect(r.opportunities[0]!.citations[0]!.url).toBe("https://a.test/1");
    expect(r.momentumLine).toContain("Hacker News: 2 items");
  });

  it("returns report-led when finding aligns with item text", () => {
    const report = `## Top findings\n\n1. PostgreSQL replication lag matters for SaaS.\n\nMore detail here.\n\n## Sources used\n\n- x`;
    const items = [
      item({
        title: "Postgres replication guide",
        url: "https://pg.test/r",
        snippet: "tutorial replication lag postgres saas",
        score: 99,
      }),
    ];
    const r = buildPublishAnglesPhase1({
      reportMarkdown: report,
      items,
      sourceRuns: runsOk({ hn: 5, reddit: 0, polymarket: 0 }),
      jobTopic: "Postgres",
    });
    expect(r.derivation).toBe("report-led");
    expect(r.opportunities.length).toBeGreaterThanOrEqual(1);
    expect(r.opportunities[0]!.citations[0]!.url).toBe("https://pg.test/r");
    expect(r.opportunities[0]!.whyItMatters).toContain("report");
  });

  it("falls back to items-led when alignment is weak", () => {
    const report = `## Top findings\n\n1. Quantum flubber economics in 2031.\n\n## Sources`;
    const items = [
      item({
        title: "Unrelated knitting patterns",
        url: "https://knit.test/k",
        snippet: "yarn wool patterns",
        score: 50,
      }),
    ];
    const r = buildPublishAnglesPhase1({
      reportMarkdown: report,
      items,
      sourceRuns: runsOk({ hn: 0, reddit: 0, polymarket: 0 }),
      jobTopic: "Knitting",
    });
    expect(r.derivation).toBe("items-led");
    expect(r.opportunities[0]!.citations[0]!.url).toBe("https://knit.test/k");
  });

  it("returns null momentum when no succeeded items", () => {
    const r = buildPublishAnglesPhase1({
      reportMarkdown: null,
      items: [],
      sourceRuns: [
        { source: "hn", status: "failed", itemCount: 0 },
        { source: "reddit", status: "succeeded", itemCount: 0 },
      ],
      jobTopic: "x",
    });
    expect(r.momentumLine).toBeNull();
    expect(r.opportunities).toHaveLength(0);
  });

  it("ranks report-led by alignment then finding index", () => {
    const report = `## Top findings\n\n1. alpha beta gamma sharedword.\n\n2. alpha beta gamma sharedword extra.\n\n## Sources`;
    const items = [
      item({
        title: "sharedword delta",
        url: "https://z.test/z",
        snippet: "alpha beta gamma",
        score: 10,
      }),
      item({
        title: "sharedword epsilon",
        url: "https://a.test/a",
        snippet: "alpha beta gamma",
        score: 9,
      }),
    ];
    const r = buildPublishAnglesPhase1({
      reportMarkdown: report,
      items,
      sourceRuns: runsOk({ hn: 1, reddit: 0, polymarket: 0 }),
      jobTopic: "test",
    });
    expect(r.derivation).toBe("report-led");
    expect(r.opportunities.length).toBeLessThanOrEqual(PUBLISH_ANGLES_PHASE1.MAX_OPPORTUNITIES);
  });

  it("dedupes URLs in items-led", () => {
    const items = [
      item({ title: "A", url: "https://dup", snippet: "s1", score: 10 }),
      item({ title: "B", url: "https://dup", snippet: "s2", score: 9 }),
      item({ title: "C", url: "https://other", snippet: "s3", score: 8 }),
    ];
    const r = buildPublishAnglesPhase1({
      reportMarkdown: "",
      items,
      sourceRuns: runsOk({ hn: 3, reddit: 0, polymarket: 0 }),
      jobTopic: "t",
    });
    expect(r.derivation).toBe("items-led");
    const urls = r.opportunities.flatMap((o) => o.citations.map((c) => c.url));
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://dup");
    expect(urls).toContain("https://other");
  });

  it("items-led uses global rank for confidence after URL dedupe", () => {
    const items = [
      item({ title: "R1", url: "https://dup", snippet: "x", score: 10 }),
      item({ title: "R1b", url: "https://dup", snippet: "x", score: 9 }),
      item({ title: "R3", url: "https://3", snippet: "x", score: 8 }),
      item({ title: "R4", url: "https://4", snippet: "x", score: 7 }),
    ];
    const r = buildPublishAnglesPhase1({
      reportMarkdown: "",
      items,
      sourceRuns: runsOk({ hn: 4, reddit: 0, polymarket: 0 }),
      jobTopic: "t",
    });
    expect(r.opportunities).toHaveLength(3);
    const last = r.opportunities[2]!;
    expect(last.citations[0]!.url).toBe("https://4");
    expect(last.confidence).toBe("low");
  });

  it("never puts item id in citations", () => {
    const r = buildPublishAnglesPhase1({
      reportMarkdown: "",
      items: [item({ title: "T", url: "https://u", snippet: "s", score: 1 })],
      sourceRuns: runsOk({ hn: 1, reddit: 0, polymarket: 0 }),
      jobTopic: "t",
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain("00000000-0000-4000-8000");
  });
});
