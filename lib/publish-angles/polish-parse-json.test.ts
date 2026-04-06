import { describe, expect, it } from "vitest";
import { extractJsonObject } from "./polish-parse-json";

describe("extractJsonObject", () => {
  it("parses raw JSON", () => {
    const j = extractJsonObject(`{"headline":"A","dek":"B","lead":"C","bullets":["x"]}`);
    expect(j).toEqual({ headline: "A", dek: "B", lead: "C", bullets: ["x"] });
  });

  it("strips markdown fence", () => {
    const j = extractJsonObject(
      "```json\n{\"headline\":\"H\",\"dek\":\"D\",\"lead\":\"L\",\"bullets\":[\"1\"]}\n```"
    );
    expect(j).toEqual({ headline: "H", dek: "D", lead: "L", bullets: ["1"] });
  });

  it("extracts first object from surrounding text", () => {
    const j = extractJsonObject(`Here:\n{"headline":"H","dek":"D","lead":"L","bullets":[]}\nDone`);
    expect(j).toEqual({ headline: "H", dek: "D", lead: "L", bullets: [] });
  });
});
