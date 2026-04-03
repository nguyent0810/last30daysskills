"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";

type ThreadInsightPayload = {
  summaryLine: string;
  direction: "rising" | "flat" | "fading" | "sparse";
  sourceDominance: "reddit" | "hacker_news" | "mixed" | "weak";
};

type PublicRun = {
  status: string;
  createdAt: string;
  reportMode: ReportModeApi;
  insightLine: string | null;
  vsPreviousLine: string | null;
};

type PublicPayload = {
  title: string;
  topic: string;
  threadInsight: ThreadInsightPayload | null;
  sincePreviousRun: { newLinkCount: number } | null;
  runs: PublicRun[];
  briefText: string;
  shareFeedbackUp: number;
  shareFeedbackDown: number;
};

function directionPillLabel(d: ThreadInsightPayload["direction"]): string {
  switch (d) {
    case "rising":
      return "Rising";
    case "fading":
      return "Fading";
    case "sparse":
      return "Sparse";
    default:
      return "Flat";
  }
}

function dominancePillLabel(s: ThreadInsightPayload["sourceDominance"]): string {
  switch (s) {
    case "reddit":
      return "Reddit-heavy";
    case "hacker_news":
      return "HN-heavy";
    case "weak":
      return "Weak signal";
    default:
      return "Mixed";
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PublicThreadPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/public/thread/${encodeURIComponent(token)}`);
    if (!res.ok) {
      const t = await res.text();
      let msg = t || res.statusText;
      try {
        const j = JSON.parse(t) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* plain */
      }
      setError(msg);
      setData(null);
      return;
    }
    const payload = (await res.json()) as PublicPayload;
    setData(payload);
    setError(null);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendVote(vote: "up" | "down") {
    if (!token || feedbackBusy) return;
    setFeedbackBusy(true);
    try {
      const res = await fetch(`/api/public/thread/${encodeURIComponent(token)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) return;
      const j = (await res.json()) as { shareFeedbackUp: number; shareFeedbackDown: number };
      setData((prev) =>
        prev ? { ...prev, shareFeedbackUp: j.shareFeedbackUp, shareFeedbackDown: j.shareFeedbackDown } : prev
      );
    } finally {
      setFeedbackBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="page-shell">
        <p className="error">Invalid link.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell public-thread">
        <p className="breadcrumb">
          <Link href="/">Home</Link>
        </p>
        <p className="error">{error === "Not found" ? "This shared link isn’t available." : error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-shell public-thread">
        <p className="breadcrumb">
          <Link href="/">Home</Link>
        </p>
        <div className="loading-block muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="page-shell public-thread">
      <p className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="muted"> · Shared thread</span>
      </p>

      <header className="public-thread__header">
        <h1 className="page-title" style={{ marginBottom: "0.35rem" }}>
          {data.title}
        </h1>
        <p className="thread-page__topic">Topic: {data.topic}</p>
      </header>

      {data.threadInsight ? (
        <div className="thread-insight-strip public-thread__strip">
          <p className="thread-insight-strip__summary">{data.threadInsight.summaryLine}</p>
          {data.sincePreviousRun ? (
            <p className="thread-insight-strip__foot">
              {data.sincePreviousRun.newLinkCount} new link{data.sincePreviousRun.newLinkCount === 1 ? "" : "s"} since the
              previous run.
            </p>
          ) : null}
          <div className="thread-insight-strip__pills">
            <span className="thread-insight-pill">{directionPillLabel(data.threadInsight.direction)}</span>
            <span className="thread-insight-pill thread-insight-pill--muted">
              {dominancePillLabel(data.threadInsight.sourceDominance)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="thread-brief public-thread__brief">
        <h2 className="thread-brief__heading">Thread brief</h2>
        <pre className="thread-brief__preview">{data.briefText}</pre>
      </div>

      <h2 className="section-title" style={{ marginTop: "1.75rem" }}>
        <span className="public-thread__section-label">Recent runs</span>
      </h2>
      {data.runs.length === 0 ? (
        <p className="muted">No runs yet.</p>
      ) : (
        <ul className="history-list" style={{ marginTop: "0.65rem" }}>
          {data.runs.map((run, i) => (
            <li key={`${run.createdAt}-${i}`}>
              <div className="public-thread__run-card">
                <p className="history-card-title" style={{ marginBottom: "0.2rem" }}>
                  Run · {formatTime(run.createdAt)}
                </p>
                <div className="history-card-meta" style={{ gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <StatusBadge status={run.status} />
                  <span className="report-mode-pill">{reportModeLabel(run.reportMode)}</span>
                  {i === 0 ? (
                    <span
                      className="muted"
                      style={{
                        fontSize: "0.7rem",
                        opacity: 0.55,
                        fontWeight: 400,
                        letterSpacing: "0.02em",
                      }}
                    >
                      Latest
                    </span>
                  ) : null}
                </div>
                {run.insightLine ? <p className="thread-run-insight">{run.insightLine}</p> : null}
                {run.vsPreviousLine ? <p className="thread-run-vs-prev">vs prior run: {run.vsPreviousLine}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="public-thread__feedback">
        <p className="public-thread__feedback-prompt muted">Was this useful?</p>
        <div className="public-thread__feedback-row">
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={feedbackBusy}
            onClick={() => void sendVote("up")}
            aria-label="Yes, useful"
          >
            👍
          </button>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={feedbackBusy}
            onClick={() => void sendVote("down")}
            aria-label="Not useful"
          >
            👎
          </button>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {data.shareFeedbackUp}↑ · {data.shareFeedbackDown}↓
          </span>
        </div>
      </div>
    </div>
  );
}
