import type { SourceRunLike } from "./hero-insight";

/** One-line deterministic interpretation per source run. */
export function sourceInterpretation(r: SourceRunLike): string {
  if (r.status === "failed") {
    const e = (r.error ?? "").toLowerCase();
    if (e.includes("403") || e.includes("blocked")) {
      return "Blocked by upstream";
    }
    return "Couldn’t load for this run";
  }

  if (r.itemCount === 0) {
    return "No relevant matches";
  }

  if (r.itemCount >= 8) {
    return "Strong match volume";
  }

  if (r.itemCount >= 3) {
    return "Useful matches for this topic";
  }

  return "Light but relevant activity";
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
