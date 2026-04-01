import type { ScoredItem } from "./types";
import { sortByScoreDesc } from "./score";

/** Deterministic markdown report (no LLM). */
export function buildDeterministicReport(topic: string, items: ScoredItem[]): string {
  const sorted = sortByScoreDesc(items);
  const top = sorted.slice(0, 15);
  const lines: string[] = [];
  lines.push(`# Research: ${topic}`);
  lines.push("");
  lines.push(`_Generated without AI — deterministic summary._`);
  lines.push("");
  lines.push("## Top findings");
  lines.push("");
  if (top.length === 0) {
    lines.push("_No items matched the topic across configured sources._");
    return lines.join("\n");
  }
  for (let i = 0; i < top.length; i++) {
    const it = top[i];
    lines.push(`${i + 1}. **${escapeMd(it.title)}** (${it.source}, score ${it.score.toFixed(2)})`);
    lines.push(`   - ${escapeMd(it.snippet.slice(0, 240))}${it.snippet.length > 240 ? "…" : ""}`);
    lines.push(`   - ${it.url}`);
    lines.push("");
  }
  lines.push("## Sources used");
  lines.push("");
  lines.push("- Hacker News (Algolia API)");
  lines.push("- Polymarket (Gamma API, keyword filter)");
  lines.push("- Reddit (public `search.json`; often blocked from cloud IPs — best-effort)");
  return lines.join("\n");
}

function escapeMd(s: string): string {
  return s.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}
