import { describe, expect, it } from "vitest";
import { isRecapOutputAcceptable } from "./quality";

describe("isRecapOutputAcceptable", () => {
  it("accepts structured grounded output", () => {
    const text = `Summary:
This run is mostly a historical prediction-question list from 2020.
Main themes:
- Politics
- COVID
- Crypto and finance
Examples:
- Trump election question
- Biden COVID question
Takeaway:
This is a weakly related historical set, not a direct answer.`;
    expect(isRecapOutputAcceptable(text, "en")).toBe(true);
  });

  it("rejects generic filler text", () => {
    expect(isRecapOutputAcceptable("This is a broad trend recap across many sectors.", "en")).toBe(false);
  });

  it("accepts Japanese headings when language is ja", () => {
    const text = `要約:
この実行は主に2020年の予測設問セットです。
主要テーマ:
- 政治
- 暗号資産
具体例:
- 選挙関連の設問
- 価格予測の設問
示唆:
クエリへの直接的関連は弱いです。`;
    expect(isRecapOutputAcceptable(text, "ja")).toBe(true);
  });
});

