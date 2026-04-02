import { describe, expect, it } from "vitest";
import { factualInsightLine, mainInsightLine } from "./hero-insight";

const run = (
  source: string,
  status: "succeeded" | "failed",
  itemCount: number,
  error: string | null = null
) => ({ source, status, error, itemCount });

describe("mainInsightLine", () => {
  it("low signal when no items", () => {
    expect(mainInsightLine("Rust", [run("hn", "succeeded", 0), run("reddit", "failed", 0, "403")])).toBe(
      "Low signal for this topic"
    );
  });

  it("strong signal when volume and no failures", () => {
    const runs = [run("hn", "succeeded", 6), run("reddit", "succeeded", 5)];
    expect(mainInsightLine("Rust async", runs)).toContain("Strong signal");
    expect(mainInsightLine("Rust async", runs)).toContain("Rust async");
  });

  it("mixed when failures but some items", () => {
    const runs = [run("hn", "succeeded", 5), run("reddit", "failed", 0, "blocked")];
    expect(mainInsightLine("X", runs)).toBe("Mixed signal with useful technical discussion");
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
