import { describe, expect, it } from "vitest";
import { RESEARCH_LIST_VIEW_RECENT } from "@/lib/api/jobs-list-query";
import {
  HOME_JOBS_VIEW_RECENT,
  HOME_RECENT_JOBS_LIMIT,
  homeRecentJobsListUrl,
} from "./history-list-view";

describe("homeRecentJobsListUrl", () => {
  it("includes limit=5 and view=recent for Home strip", () => {
    const u = new URL(homeRecentJobsListUrl(), "https://example.com");
    expect(u.pathname).toBe("/api/jobs");
    expect(u.searchParams.get("limit")).toBe(String(HOME_RECENT_JOBS_LIMIT));
    expect(u.searchParams.get("view")).toBe(RESEARCH_LIST_VIEW_RECENT);
    expect(HOME_JOBS_VIEW_RECENT).toBe(RESEARCH_LIST_VIEW_RECENT);
  });
});
