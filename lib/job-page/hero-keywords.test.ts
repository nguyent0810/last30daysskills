import { describe, expect, it } from "vitest";
import { formatKeywordPhrase, keywordsFromTopItems } from "./hero-keywords";

describe("keywordsFromTopItems", () => {
  it("pulls repeated themes from titles", () => {
    const items = [
      { title: "PostgreSQL indexing strategies", snippet: "b-tree and hash" },
      { title: "Postgres performance tips", snippet: "vacuum analyze" },
    ];
    const k = keywordsFromTopItems(items);
    expect(k.join(" ").toLowerCase()).toMatch(/indexing|performance|postgres/);
  });

  it("formatKeywordPhrase", () => {
    expect(formatKeywordPhrase(["Rust"])).toBe("“Rust”");
    expect(formatKeywordPhrase(["a", "b"])).toBe("“a” and “b”");
  });
});
