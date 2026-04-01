import { describe, expect, it } from "vitest";
import { dedupeByUrl } from "./dedupe";
import type { ResearchItemInput } from "./types";

describe("dedupeByUrl", () => {
  it("keeps first URL occurrence", () => {
    const items: ResearchItemInput[] = [
      { source: "hn", title: "a", url: "https://x.com/1", snippet: "s" },
      { source: "hn", title: "b", url: "https://x.com/1#h", snippet: "t" },
    ];
    const out = dedupeByUrl(items);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("a");
  });
});
