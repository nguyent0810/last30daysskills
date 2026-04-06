import type { PublishAnglePolishResponse } from "@/lib/publish-angles/polish-schema";
import type { PublishAnglesOpportunity } from "@/lib/publish-angles/types";

export function formatDeterministicAngleForCopy(op: PublishAnglesOpportunity): string {
  const lines = [
    op.workingTitle,
    "",
    op.dek,
    "",
    op.whyItMatters,
    "",
    ...op.outline.map((b) => `- ${b}`),
    "",
    "Sources:",
    ...op.citations.map((c) => `- ${c.title} (${c.source})`),
  ];
  return lines.join("\n");
}

export function formatPolishForCopy(p: PublishAnglePolishResponse): string {
  const bullets = p.bullets.map((b) => `- ${b}`).join("\n");
  const cites = p.citations.map((c) => `- ${c.title} (${c.source})`).join("\n");
  return `${p.headline}\n\n${p.dek}\n\n${p.lead}\n\n${bullets}\n\nSources:\n${cites}`;
}
