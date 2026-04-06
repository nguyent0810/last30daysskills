import { describe, expect, it } from "vitest";
import { deriveJobSignalRail, topicAccentHue } from "./side-rails-signal";

const run = (
  source: string,
  status: string,
  itemCount: number
): { source: string; status: string; itemCount: number } => ({
  source,
  status,
  itemCount,
});

describe("deriveJobSignalRail", () => {
  it("detects HN dominant", () => {
    const d = deriveJobSignalRail(
      [run("hn", "succeeded", 20), run("reddit", "succeeded", 3), run("polymarket", "succeeded", 2)],
      "succeeded"
    );
    expect(d.shapeLabel).toBe("Hacker News dominant");
    expect(d.itemTotal).toBe(25);
  });

  it("detects single-source", () => {
    const d = deriveJobSignalRail(
      [run("hn", "succeeded", 15), run("reddit", "succeeded", 0), run("polymarket", "failed", 0)],
      "succeeded"
    );
    expect(d.shapeLabel).toBe("Single-source signal");
  });

  it("notes failed feeds in coverage when total zero", () => {
    const d = deriveJobSignalRail(
      [run("hn", "failed", 0), run("reddit", "failed", 0), run("polymarket", "failed", 0)],
      "failed"
    );
    expect(d.shapeLabel).toBe("No live signal");
    expect(d.coverageNote).toMatch(/feeds|sources/i);
  });
});

describe("topicAccentHue", () => {
  it("is stable", () => {
    expect(topicAccentHue("Rust")).toBe(topicAccentHue("Rust"));
  });
});
