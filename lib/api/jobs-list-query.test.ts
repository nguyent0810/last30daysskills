import { describe, expect, it } from "vitest";
import {
  RESEARCH_LIST_LIMIT_MAX,
  RESEARCH_LIST_VIEW_RECENT,
  isResearchListViewRecent,
  resolveResearchListLimit,
} from "./jobs-list-query";

describe("resolveResearchListLimit", () => {
  it("returns max when limit omitted", () => {
    expect(resolveResearchListLimit(new URLSearchParams())).toBe(RESEARCH_LIST_LIMIT_MAX);
  });

  it("returns max when limit is empty string", () => {
    expect(resolveResearchListLimit(new URLSearchParams("limit="))).toBe(RESEARCH_LIST_LIMIT_MAX);
  });

  it("returns max when limit is not a number", () => {
    expect(resolveResearchListLimit(new URLSearchParams("limit=abc"))).toBe(RESEARCH_LIST_LIMIT_MAX);
  });

  it("clamps to 1 when limit is 0", () => {
    expect(resolveResearchListLimit(new URLSearchParams("limit=0"))).toBe(1);
  });

  it("parses valid limit", () => {
    expect(resolveResearchListLimit(new URLSearchParams("limit=5"))).toBe(5);
  });

  it("clamps to max when over cap", () => {
    expect(resolveResearchListLimit(new URLSearchParams("limit=999"))).toBe(RESEARCH_LIST_LIMIT_MAX);
  });
});

describe("isResearchListViewRecent", () => {
  it("is true when view=recent", () => {
    expect(isResearchListViewRecent(new URLSearchParams(`view=${RESEARCH_LIST_VIEW_RECENT}`))).toBe(true);
  });

  it("is false when view missing", () => {
    expect(isResearchListViewRecent(new URLSearchParams())).toBe(false);
  });

  it("is false for other view values", () => {
    expect(isResearchListViewRecent(new URLSearchParams("view=history"))).toBe(false);
  });
});
