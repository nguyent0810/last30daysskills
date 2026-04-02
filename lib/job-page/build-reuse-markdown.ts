/**
 * Single clipboard payload for “Copy for reuse”: header + exact report + deduped sources (title + URL only).
 */

import { normalizeUrlForReuse, urlMatchKey } from "@/lib/url-match";

export type ReuseSourceItem = { title: string; url: string };

function formatRunLine(createdAt: string | Date): string {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Dedupe by normalized URL (case-insensitive); first title wins. */
function dedupedSources(items: ReuseSourceItem[]): { title: string; url: string }[] {
  const seen = new Map<string, { title: string; url: string }>();
  for (const it of items) {
    const url = normalizeUrlForReuse(it.url);
    const key = urlMatchKey(it.url);
    if (!key) continue;
    if (seen.has(key)) continue;
    const title = it.title.replace(/\r?\n/g, " ").trim() || "Untitled";
    seen.set(key, { title, url });
  }
  return [...seen.values()];
}

export function buildReuseMarkdown(input: {
  topic: string;
  createdAt: string | Date;
  report: string | null;
  items: ReuseSourceItem[];
}): string {
  const topicLine = input.topic.replace(/\r?\n/g, " ").trim() || "Untitled";
  const parts: string[] = [
    `# ${topicLine}`,
    `Run · ${formatRunLine(input.createdAt)}`,
    "",
    input.report ?? "",
  ];

  const sources = dedupedSources(input.items);
  if (sources.length > 0) {
    parts.push("");
    parts.push("## Sources");
    for (const { title, url } of sources) {
      parts.push(`- ${title}`);
      parts.push(`  ${url}`);
    }
  }

  return parts.join("\n");
}
