import { describe, expect, it } from "vitest";
import { buildPublishAnglePolishContext } from "./polish-context";

describe("buildPublishAnglePolishContext", () => {
  it("does not include URLs in output", () => {
    const ctx = buildPublishAnglePolishContext({
      topic: "T",
      displayTitle: null,
      workingTitle: "WT",
      dek: "D",
      whyItMatters: "W",
      outline: ["o1"],
      citations: [{ title: "Title", url: "https://secret.test/x", source: "hn" }],
      snippetByUrl: new Map([["https://secret.test/x", "Snippet"]]),
    });
    expect(ctx).not.toMatch(/https?:\/\//);
    expect(ctx).toContain("Title");
    expect(ctx).toContain("hn");
    expect(ctx).toContain("Snippet");
  });
});
