import { describe, expect, it } from "vitest";
import { scoreItems } from "./score";
import type { ResearchItemInput } from "./types";

describe("scoreItems", () => {
  it("scores higher when topic words appear", () => {
    const topic = "machine learning";
    const items: ResearchItemInput[] = [
      { source: "hn", title: "cats", url: "https://a", snippet: "cats" },
      {
        source: "hn",
        title: "machine learning paper",
        url: "https://b",
        snippet: "ml",
      },
    ];
    const scored = scoreItems(topic, items);
    const byTitle = Object.fromEntries(scored.map((s) => [s.title, s.score]));
    expect(byTitle["machine learning paper"]).toBeGreaterThan(byTitle["cats"]);
  });
});
