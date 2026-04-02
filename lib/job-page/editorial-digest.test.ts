import { describe, expect, it } from "vitest";
import { bucketForItem, groupItemsForDigest } from "./editorial-digest";

describe("bucketForItem", () => {
  it("classifies tutorial", () => {
    expect(bucketForItem("Rust async tutorial", "")).toBe("tutorials");
  });

  it("classifies discussion", () => {
    expect(bucketForItem("Discussion thread on API", "")).toBe("discussions");
  });

  it("classifies tools", () => {
    expect(bucketForItem("New library release", "")).toBe("tools");
  });

  it("defaults to other", () => {
    expect(bucketForItem("Random headline", "snippet")).toBe("other");
  });
});

describe("groupItemsForDigest", () => {
  it("groups and sorts by score", () => {
    const items = [
      { id: "1", title: "Guide to X", url: "u", snippet: "", score: 1, source: "hn" },
      { id: "2", title: "Tool launch", url: "u", snippet: "", score: 9, source: "hn" },
    ];
    const g = groupItemsForDigest(items);
    const tools = g.find((x) => x.bucket === "tools");
    expect(tools?.items[0].id).toBe("2");
  });
});
