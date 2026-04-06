import type { PublishAnglesCitation } from "./types";

const SNIPPET_MAX = 120;

function capSnippet(s: string): string {
  const t = s.trim();
  if (t.length <= SNIPPET_MAX) return t;
  return `${t.slice(0, SNIPPET_MAX - 1)}…`;
}

export type PolishContextInput = {
  topic: string;
  displayTitle: string | null;
  workingTitle: string;
  dek: string;
  whyItMatters: string;
  outline: string[];
  citations: PublishAnglesCitation[];
  /** Snippets keyed by normalized citation URL (trimmed) from DB. */
  snippetByUrl: Map<string, string>;
};

/**
 * Bounded English context for the model. No citation URLs — title + source + optional snippet only.
 */
export function buildPublishAnglePolishContext(input: PolishContextInput): string {
  const lines: string[] = [];
  lines.push(`Topic: ${input.topic}`);
  const d = input.displayTitle?.trim();
  if (d) lines.push(`Display title: ${d}`);
  lines.push("");
  lines.push("--- INPUT ANGLE ---");
  lines.push(`Working title: ${input.workingTitle}`);
  lines.push(`Dek: ${input.dek}`);
  lines.push(`Why it matters: ${input.whyItMatters}`);
  lines.push("Outline (rewrite each line in order; same count):");
  input.outline.forEach((line, i) => {
    lines.push(`${i + 1}. ${line}`);
  });
  lines.push("");
  lines.push("--- CITATIONS (title and source only; no URLs) ---");
  for (const c of input.citations) {
    const key = c.url.trim();
    const snip = input.snippetByUrl.get(key);
    lines.push(`- Title: ${c.title} | Source: ${c.source}`);
    if (snip) {
      lines.push(`  Snippet: ${capSnippet(snip)}`);
    }
  }
  return lines.join("\n").slice(0, 6000);
}
