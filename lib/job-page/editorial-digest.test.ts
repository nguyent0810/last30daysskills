import { describe, expect, it } from "vitest";
import { bucketForItem, groupItemsForDigest } from "./editorial-digest";

describe("bucketForItem", () => {
  it("classifies learn (tutorial)", () => {
    expect(bucketForItem("Rust async tutorial", "")).toBe("learn");
  });

  it("classifies learn (tooling)", () => {
    expect(bucketForItem("New library release", "")).toBe("learn");
  });

  it("classifies discuss by default", () => {
    expect(bucketForItem("Random headline", "snippet")).toBe("discuss");
  });

  it("discussion keyword still discuss unless learn pattern wins", () => {
    expect(bucketForItem("Discussion thread on API design guide", "")).toBe("learn");
  });
});

describe("groupItemsForDigest", () => {
  it("groups learn bucket and sorts by score", () => {
    const items = [
      { id: "1", title: "Guide to X", url: "u", snippet: "", score: 1, source: "hn" },
      { id: "2", title: "Tool launch", url: "u", snippet: "", score: 9, source: "hn" },
    ];
    const g = groupItemsForDigest(items);
    const learn = g.find((x) => x.bucket === "learn");
    expect(learn?.items[0].id).toBe("2");
  });
});
