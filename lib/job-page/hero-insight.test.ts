import { describe, expect, it } from "vitest";
import { factualInsightLine, mainInsightLine } from "./hero-insight";

const run = (
  source: string,
  status: "succeeded" | "failed",
  itemCount: number,
  error: string | null = null
) => ({ source, status, error, itemCount });

describe("mainInsightLine", () => {
  it("no items — concrete low outcome", () => {
    expect(mainInsightLine("Rust", [run("hn", "succeeded", 0), run("reddit", "failed", 0, "403")])).toMatch(
      /Nothing turned up/
    );
  });

  it("high volume without item text — counts forward", () => {
    const runs = [run("hn", "succeeded", 6), run("reddit", "succeeded", 5)];
    const line = mainInsightLine("Rust async", runs);
    expect(line).toMatch(/11 on-topic links/);
    expect(line).toContain("Rust async");
  });

  it("uses keywords from top items when provided", () => {
    const runs = [run("hn", "succeeded", 6), run("reddit", "succeeded", 5)];
    const items = [
      { title: "Tokio async runtime deep dive", url: "", snippet: "", score: 9, source: "hn" },
      { title: "Rust futures explained", url: "", snippet: "", score: 8, source: "hn" },
    ];
    const line = mainInsightLine("Rust async", runs, items);
    expect(line.toLowerCase()).toMatch(/tokio|rust|async/);
    expect(line).not.toMatch(/strong signal/i);
  });

  it("partial failure with results — plain language", () => {
    const runs = [run("hn", "succeeded", 5), run("reddit", "failed", 0, "blocked")];
    expect(mainInsightLine("X", runs)).toMatch(/Partial fetch|usable links/);
  });
});

describe("factualInsightLine", () => {
  it("formats counts", () => {
    expect(factualInsightLine([run("hn", "succeeded", 14), run("reddit", "succeeded", 14)])).toMatch(
      /28 results from 2 sources/
    );
  });

  it("includes failed clause", () => {
    expect(factualInsightLine([run("hn", "succeeded", 5), run("reddit", "failed", 0)])).toMatch(/1 source failed/);
  });
});
