type JobStatus = "queued" | "running" | "succeeded" | "failed" | string;

const LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const s = status.toLowerCase();
  const label = LABELS[s] ?? status;
  const cls =
    s === "succeeded"
      ? "status-badge status-badge--ok"
      : s === "failed"
        ? "status-badge status-badge--fail"
        : s === "running"
          ? "status-badge status-badge--run"
          : "status-badge status-badge--wait";
  return <span className={cls}>{label}</span>;
}
