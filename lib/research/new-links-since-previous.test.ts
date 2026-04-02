import { describe, expect, it } from "vitest";
import { countNewLinkUrlsSincePrevious, sincePreviousRunFromUrlLists } from "./new-links-since-previous";

describe("countNewLinkUrlsSincePrevious", () => {
  it("counts URLs in latest not in previous", () => {
    expect(
      countNewLinkUrlsSincePrevious(["https://a.com/x", "https://b.com/y"], ["https://a.com/x"])
    ).toBe(1);
  });

  it("dedupes duplicate URLs within latest", () => {
    expect(
      countNewLinkUrlsSincePrevious(
        ["https://a.com/new", "https://a.com/new", "HTTPS://A.COM/new"],
        []
      )
    ).toBe(1);
  });

  it("matches previous case-insensitively", () => {
    expect(countNewLinkUrlsSincePrevious(["https://X.COM/a"], ["https://x.com/a"])).toBe(0);
  });

  it("returns 0 when latest has no usable URLs", () => {
    expect(countNewLinkUrlsSincePrevious(["", "  ", "\t"], ["https://a.com"])).toBe(0);
  });

  it("treats all latest as new when previous is empty", () => {
    expect(countNewLinkUrlsSincePrevious(["https://one.test", "https://two.test"], [])).toBe(2);
  });

  it("ignores empty URLs in previous", () => {
    expect(countNewLinkUrlsSincePrevious(["https://new.test"], ["", "  "])).toBe(1);
  });
});

describe("sincePreviousRunFromUrlLists", () => {
  it("returns null when no usable latest URLs (hidden)", () => {
    expect(sincePreviousRunFromUrlLists([], [])).toBeNull();
    expect(sincePreviousRunFromUrlLists([" ", ""], ["https://a.com"])).toBeNull();
  });

  it("returns null when count is 0 (hidden)", () => {
    expect(sincePreviousRunFromUrlLists(["https://a.com"], ["https://a.com"])).toBeNull();
    expect(sincePreviousRunFromUrlLists(["https://A.COM/x"], ["https://a.com/x"])).toBeNull();
  });

  it("returns payload when at least one new link", () => {
    expect(sincePreviousRunFromUrlLists(["https://a.com", "https://b.com"], ["https://a.com"])).toEqual({
      newLinkCount: 1,
    });
  });
});
