import { describe, expect, it } from "vitest";
import { languageInstruction, resolveOutputLanguage } from "./language-hint";

describe("resolveOutputLanguage", () => {
  it("prefers Vietnamese when topic has Vietnamese marks", () => {
    expect(resolveOutputLanguage("Thị trường crypto", null, "Mostly English body text here.")).toBe("vi");
  });

  it("prefers Vietnamese when display title has Vietnamese marks", () => {
    expect(resolveOutputLanguage("neutral topic", "Báo cáo nhanh", "English only context.")).toBe("vi");
  });

  it("uses dominant Chinese script in context when title is Latin", () => {
    const ctx = "讨论 ".repeat(80);
    expect(resolveOutputLanguage("topic", null, ctx)).toBe("zh");
  });

  it("uses Japanese when kana dominates", () => {
    const ctx = "これはテストです。".repeat(30);
    expect(resolveOutputLanguage("topic", null, ctx)).toBe("ja");
  });

  it("falls back to English when mixed or unclear", () => {
    expect(resolveOutputLanguage("topic", null, "Short mixed abc 123.")).toBe("en");
  });
});

describe("languageInstruction", () => {
  it("returns Vietnamese instruction for vi", () => {
    expect(languageInstruction("vi")).toContain("Vietnamese");
  });
});
