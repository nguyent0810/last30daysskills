import { describe, expect, it } from "vitest";
import { parseResearchPatchBody } from "./parse-research-patch-body";

describe("parseResearchPatchBody", () => {
  it("accepts displayTitle-only body", () => {
    expect(parseResearchPatchBody({ displayTitle: "Hi" })).toEqual({
      ok: true,
      updates: { displayTitle: "Hi" },
    });
  });

  it("accepts archived true", () => {
    expect(parseResearchPatchBody({ archived: true })).toEqual({
      ok: true,
      updates: { archived: true },
    });
  });

  it("accepts archived false", () => {
    expect(parseResearchPatchBody({ archived: false })).toEqual({
      ok: true,
      updates: { archived: false },
    });
  });

  it("accepts pinned", () => {
    expect(parseResearchPatchBody({ pinned: true })).toEqual({
      ok: true,
      updates: { pinned: true },
    });
  });

  it("accepts note string and null", () => {
    expect(parseResearchPatchBody({ note: "watch momentum" })).toEqual({
      ok: true,
      updates: { note: "watch momentum" },
    });
    expect(parseResearchPatchBody({ note: null })).toEqual({
      ok: true,
      updates: { note: null },
    });
  });

  it("accepts pinned + note together", () => {
    expect(
      parseResearchPatchBody({ pinned: true, note: "Track for validation" })
    ).toEqual({
      ok: true,
      updates: { pinned: true, note: "Track for validation" },
    });
  });

  it("rejects displayTitle with archived", () => {
    const r = parseResearchPatchBody({ displayTitle: "x", archived: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("only one");
  });

  it("rejects empty body", () => {
    expect(parseResearchPatchBody({}).ok).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(parseResearchPatchBody({ pinned: true, extra: 1 }).ok).toBe(false);
  });

  it("rejects non-boolean archived", () => {
    expect(parseResearchPatchBody({ archived: "true" }).ok).toBe(false);
  });

  it("delegates displayTitle validation", () => {
    const r = parseResearchPatchBody({ displayTitle: "" });
    expect(r.ok).toBe(false);
  });

  it("trims empty note to null", () => {
    expect(parseResearchPatchBody({ note: "   " })).toEqual({
      ok: true,
      updates: { note: null },
    });
  });
});
