import type { SourceRunLike } from "./hero-insight";

function topicShort(topic: string): string {
  const t = topic.trim();
  if (!t) return "this";
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

/** One-line deterministic interpretation — conversational, source-aware. */
export function sourceInterpretation(r: SourceRunLike, topic: string): string {
  const t = topicShort(topic);

  if (r.status === "failed") {
    const e = (r.error ?? "").toLowerCase();
    if (e.includes("403") || e.includes("blocked")) {
      return "This feed blocked the request — nothing personal, just an upstream wall.";
    }
    return "Couldn’t reach this source for the run — the rest of the job still counts.";
  }

  if (r.itemCount === 0) {
    if (r.source === "polymarket") {
      return `No markets obviously tied to “${t}” showed up — try a sharper market keyword later.`;
    }
    if (r.source === "reddit") {
      return "Reddit came back empty for this wording — it’s picky from some networks.";
    }
    return `Quiet here: nothing matched “${t}” in this pass.`;
  }

  if (r.source === "hn") {
    if (r.itemCount >= 8) {
      return "HN is actively talking about this — plenty of threads to open.";
    }
    if (r.itemCount >= 3) {
      return "A few strong HN hits; good place to see how builders frame it.";
    }
    return "A light HN footprint, but what’s there is on-brief.";
  }

  if (r.source === "polymarket") {
    if (r.itemCount >= 5) {
      return "Several markets reference this theme — useful sentiment snapshot.";
    }
    return "A couple of relevant markets — quick check on how odds are priced.";
  }

  if (r.source === "reddit") {
    if (r.itemCount >= 6) {
      return "Reddit’s chatty on this — expect opinions, anecdotes, and rabbit holes.";
    }
    if (r.itemCount >= 3) {
      return "Some solid threads; good for how non-experts talk about it.";
    }
    return "Thin Reddit slice, still worth a glance for tone.";
  }

  if (r.itemCount >= 8) {
    return "High volume from this source — skim titles before you commit.";
  }
  if (r.itemCount >= 3) {
    return "Enough here to justify opening a few links.";
  }
  return "Sparse, but the matches line up with what you asked.";
}

export type SourceCardStatus = "failed" | "empty" | "ok";

export function sourceCardStatus(r: SourceRunLike): SourceCardStatus {
  if (r.status === "failed") return "failed";
  if (r.status === "succeeded" && r.itemCount === 0) return "empty";
  return "ok";
}

export function sourceCardStatusLabel(s: SourceCardStatus): string {
  switch (s) {
    case "failed":
      return "Failed";
    case "empty":
      return "No matches";
    default:
      return "OK";
  }
}
