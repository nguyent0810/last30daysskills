import { describe, expect, it } from "vitest";
import { parseResearchPatchBody } from "./parse-research-patch-body";

describe("parseResearchPatchBody", () => {
  it("accepts displayTitle-only body", () => {
    expect(parseResearchPatchBody({ displayTitle: "Hi" })).toEqual({
      ok: true,
      op: { kind: "displayTitle", displayTitle: "Hi" },
    });
  });

  it("accepts archived true", () => {
    expect(parseResearchPatchBody({ archived: true })).toEqual({
      ok: true,
      op: { kind: "archive", archived: true },
    });
  });

  it("accepts archived false", () => {
    expect(parseResearchPatchBody({ archived: false })).toEqual({
      ok: true,
      op: { kind: "archive", archived: false },
    });
  });

  it("rejects both keys", () => {
    const r = parseResearchPatchBody({ displayTitle: "x", archived: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("only one");
  });

  it("rejects neither key", () => {
    const r = parseResearchPatchBody({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Invalid body");
  });

  it("rejects non-boolean archived", () => {
    expect(parseResearchPatchBody({ archived: "true" }).ok).toBe(false);
    expect(parseResearchPatchBody({ archived: 1 }).ok).toBe(false);
  });

  it("delegates displayTitle validation", () => {
    const r = parseResearchPatchBody({ displayTitle: "" });
    expect(r.ok).toBe(false);
  });
});
