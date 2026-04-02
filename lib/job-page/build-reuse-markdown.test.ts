import { describe, expect, it } from "vitest";
import { buildReuseMarkdown } from "./build-reuse-markdown";

const fixedDate = new Date("2024-06-15T14:30:00.000Z");

describe("buildReuseMarkdown", () => {
  it("builds header and report without sources when items empty", () => {
    const md = buildReuseMarkdown({
      topic: "My topic",
      createdAt: fixedDate,
      report: "## Findings\n\nHello.",
      items: [],
    });
    expect(md).toContain("# My topic");
    expect(md).toMatch(/Run ·/);
    expect(md).toContain("## Findings");
    expect(md).toContain("Hello.");
    expect(md).not.toContain("## Sources");
  });

  it("appends deduped sources with title and indented URL", () => {
    const md = buildReuseMarkdown({
      topic: "T",
      createdAt: fixedDate,
      report: "Body.",
      items: [
        { title: "A", url: "https://a.test/x" },
        { title: "B", url: "https://b.test/y" },
      ],
    });
    expect(md).toContain("## Sources");
    expect(md).toContain("- A");
    expect(md).toContain("  https://a.test/x");
    expect(md).toContain("- B");
    expect(md).toContain("  https://b.test/y");
  });

  it("dedupes by URL case-insensitively; first title wins", () => {
    const md = buildReuseMarkdown({
      topic: "T",
      createdAt: fixedDate,
      report: "",
      items: [
        { title: "First", url: "https://x.com/a" },
        { title: "Second", url: "HTTPS://X.COM/a" },
      ],
    });
    expect(md).toContain("- First");
    expect(md).not.toContain("Second");
    expect(md.match(/## Sources/g)?.length).toBe(1);
  });

  it("handles null report", () => {
    const md = buildReuseMarkdown({
      topic: "T",
      createdAt: fixedDate,
      report: null,
      items: [],
    });
    expect(md).toContain("# T");
    expect(md).not.toContain("## Sources");
  });

  it("uses Untitled for empty title", () => {
    const md = buildReuseMarkdown({
      topic: "T",
      createdAt: fixedDate,
      report: "",
      items: [{ title: "  ", url: "https://z.test" }],
    });
    expect(md).toContain("- Untitled");
    expect(md).toContain("  https://z.test");
  });

  it("skips items with empty URL", () => {
    const md = buildReuseMarkdown({
      topic: "T",
      createdAt: fixedDate,
      report: "",
      items: [{ title: "X", url: "   " }],
    });
    expect(md).not.toContain("## Sources");
  });
});
