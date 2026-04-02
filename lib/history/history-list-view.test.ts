import { describe, expect, it } from "vitest";
import {
  HISTORY_ARCHIVED_QUERY,
  historyArchivedListPath,
  historyJobsListUrl,
  isHistoryArchivedView,
} from "./history-list-view";

function params(entries: Record<string, string>): URLSearchParams {
  return new URLSearchParams(entries);
}

describe("isHistoryArchivedView", () => {
  it("is false by default", () => {
    expect(isHistoryArchivedView(params({}))).toBe(false);
  });

  it("is true when archived=1", () => {
    expect(isHistoryArchivedView(params({ archived: "1" }))).toBe(true);
  });

  it("is false for other archived values", () => {
    expect(isHistoryArchivedView(params({ archived: "true" }))).toBe(false);
    expect(isHistoryArchivedView(params({ archived: "0" }))).toBe(false);
  });
});

describe("historyJobsListUrl", () => {
  it("matches GET /api/jobs contract", () => {
    expect(historyJobsListUrl(false)).toBe("/api/jobs");
    expect(historyJobsListUrl(true)).toBe(`/api/jobs?${HISTORY_ARCHIVED_QUERY}`);
  });
});

describe("historyArchivedListPath", () => {
  it("uses the same archived query as the jobs API", () => {
    expect(historyArchivedListPath()).toBe(`/history?${HISTORY_ARCHIVED_QUERY}`);
    expect(HISTORY_ARCHIVED_QUERY).toBe("archived=1");
  });
});
