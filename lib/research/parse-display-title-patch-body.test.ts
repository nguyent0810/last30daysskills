import { describe, expect, it } from "vitest";
import { parseDisplayTitlePatchBody } from "./parse-display-title-patch-body";

describe("parseDisplayTitlePatchBody", () => {
  it("accepts null to clear", () => {
    expect(parseDisplayTitlePatchBody({ displayTitle: null })).toEqual({
      ok: true,
      displayTitle: null,
    });
  });

  it("trims and accepts non-empty string", () => {
    expect(parseDisplayTitlePatchBody({ displayTitle: "  Hello  " })).toEqual({
      ok: true,
      displayTitle: "Hello",
    });
  });

  it("rejects missing displayTitle key", () => {
    const r = parseDisplayTitlePatchBody({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Invalid body");
  });

  it("rejects wrong type for displayTitle", () => {
    expect(parseDisplayTitlePatchBody({ displayTitle: 1 }).ok).toBe(false);
    expect(parseDisplayTitlePatchBody({ displayTitle: undefined }).ok).toBe(false);
  });

  it("rejects empty string", () => {
    const r = parseDisplayTitlePatchBody({ displayTitle: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("empty");
  });

  it("rejects whitespace-only string", () => {
    const r = parseDisplayTitlePatchBody({ displayTitle: "   \t  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("whitespace");
  });

  it("rejects over max length after trim", () => {
    const r = parseDisplayTitlePatchBody({ displayTitle: "a".repeat(501) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("500");
  });

  it("accepts exactly max length", () => {
    const s = "a".repeat(500);
    expect(parseDisplayTitlePatchBody({ displayTitle: s })).toEqual({
      ok: true,
      displayTitle: s,
    });
  });
});
