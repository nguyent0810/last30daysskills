"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";

type JobRow = {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  reportMode: ReportModeApi;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/jobs", { credentials: "include" });
      if (!res.ok) {
        const t = await res.text();
        setError(t || res.statusText);
        return;
      }
      const data = (await res.json()) as { jobs: JobRow[] };
      setJobs(data.jobs);
    })();
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="page-title">History</h1>
        <p className="error">{error}</p>
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    );
  }

  if (!jobs) {
    return (
      <div>
        <h1 className="page-title">History</h1>
        <div className="loading-block muted">Loading your jobs…</div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div>
        <h1 className="page-title">History</h1>
        <div className="empty-state">
          <p className="muted" style={{ margin: 0 }}>
            No research runs yet for this browser.
          </p>
          <p className="muted">Start a topic from the home page — we keep jobs tied to this session only.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
            New research
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">History</h1>
      <p className="page-lead muted">Research runs for this browser session. Open a row for sources and report.</p>
      <ul className="history-list">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link href={`/job/${j.id}`} className="history-card">
              <p className="history-card-title">{j.topic}</p>
              <div className="history-card-meta">
                <StatusBadge status={j.status} />
                <span className="report-mode-pill">{reportModeLabel(j.reportMode)}</span>
                <span className="history-time">{formatTime(j.createdAt)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
