import { describe, expect, it } from "vitest";
import {
  resolveJobDetailThread,
  threadOrientationForUi,
  threadOrientationLabel,
} from "./job-detail-thread";

const sessionUser = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const otherUser = "11111111-2222-3333-4444-555555555555";

const researchRow = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  topic: "canonical topic",
  displayTitle: null as string | null,
  userId: sessionUser,
};

describe("resolveJobDetailThread", () => {
  it("returns null when researchId is null", () => {
    expect(resolveJobDetailThread(null, researchRow, sessionUser)).toBeNull();
  });

  it("returns populated thread for valid same-owner research", () => {
    expect(resolveJobDetailThread(researchRow.id, researchRow, sessionUser)).toEqual({
      id: researchRow.id,
      topic: "canonical topic",
      displayTitle: null,
      isPinned: false,
      note: null,
    });
  });

  it("returns null when research row is missing", () => {
    expect(resolveJobDetailThread(researchRow.id, null, sessionUser)).toBeNull();
    expect(resolveJobDetailThread(researchRow.id, undefined, sessionUser)).toBeNull();
  });

  it("returns null when research row belongs to another user", () => {
    expect(
      resolveJobDetailThread(researchRow.id, { ...researchRow, userId: otherUser }, sessionUser)
    ).toBeNull();
  });
});

describe("threadOrientationLabel", () => {
  it("uses displayTitle when non-empty after trim", () => {
    expect(
      threadOrientationLabel({
        id: "x",
        topic: "topic",
        displayTitle: "  Custom  ",
      })
    ).toBe("Custom");
  });

  it("falls back to topic when displayTitle is null or whitespace-only", () => {
    expect(
      threadOrientationLabel({
        id: "x",
        topic: "fallback topic",
        displayTitle: null,
      })
    ).toBe("fallback topic");
    expect(
      threadOrientationLabel({
        id: "x",
        topic: "fallback topic",
        displayTitle: "   \t",
      })
    ).toBe("fallback topic");
  });
});

describe("threadOrientationForUi", () => {
  it("returns null when thread is null (no Thread line)", () => {
    expect(threadOrientationForUi(null)).toBeNull();
  });

  it("returns href and label when thread is populated", () => {
    expect(
      threadOrientationForUi({
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        topic: "T",
        displayTitle: null,
      })
    ).toEqual({
      href: "/research/cccccccc-cccc-cccc-cccc-cccccccccccc",
      label: "T",
    });
  });

  it("uses displayTitle?.trim() || topic for label", () => {
    expect(
      threadOrientationForUi({
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        topic: "Topic",
        displayTitle: "  Label  ",
      })
    ).toEqual({
      href: "/research/cccccccc-cccc-cccc-cccc-cccccccccccc",
      label: "Label",
    });
  });
});
