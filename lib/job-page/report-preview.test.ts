import { describe, expect, it } from "vitest";
import { buildReportPreview, parseFindingBlocksFromReport, splitNumberedFindingBlocks } from "./report-preview";

const SAMPLE = `# Research: Test

_Intro._

## Top findings

1. **First** (hn, score 1.00)
   - Snip
   - https://a.test

2. **Second** (hn, score 0.90)
   - Snip
   - https://b.test

## Sources used

- Hacker News
`;

describe("splitNumberedFindingBlocks", () => {
  it("splits numbered items", () => {
    const blocks = splitNumberedFindingBlocks(`1. A\n\n2. B`);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatch(/^1\. A/);
  });
});

describe("parseFindingBlocksFromReport", () => {
  it("returns numbered blocks under the findings heading", () => {
    const blocks = parseFindingBlocksFromReport(SAMPLE);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatch(/First/);
  });

  it("returns empty array when heading is missing", () => {
    expect(parseFindingBlocksFromReport("# Hello\n\nNo section.")).toEqual([]);
  });
});

describe("buildReportPreview", () => {
  it("hides sections after findings when a tail exists (e.g. Sources used)", () => {
    const p = buildReportPreview(SAMPLE, 10);
    expect(p.hasMore).toBe(true);
    expect(p.collapsed).not.toMatch(/Sources used/);
    expect(p.totalFindings).toBe(2);
    expect(p.visibleFindings).toBe(2);
    expect(p.collapsed).toMatch(/closing notes|full report/i);
  });

  it("no expand when report ends after findings", () => {
    const md = "# T\n\n## Top findings\n\n1. **A**\n   - x\n\n2. **B**\n   - y\n";
    const p = buildReportPreview(md, 10);
    expect(p.hasMore).toBe(false);
    expect(p.collapsed).toBe(md);
  });

  it("truncates findings and hides tail sections", () => {
    let md = `# Research: T\n\n## Top findings\n\n`;
    for (let i = 1; i <= 10; i++) {
      md += `${i}. **Item ${i}**\n   - x\n   - http://x\n\n`;
    }
    md += "## Sources used\n\n- Src\n";
    const p = buildReportPreview(md, 8);
    expect(p.hasMore).toBe(true);
    expect(p.totalFindings).toBe(10);
    expect(p.visibleFindings).toBe(8);
    expect(p.collapsed).toMatch(/Showing 8 of 10/);
    expect(p.collapsed).not.toMatch(/Sources used/);
  });
});
