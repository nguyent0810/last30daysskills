"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";
import {
  historyArchivedListPath,
  historyJobsListUrl,
  isHistoryArchivedView,
} from "@/lib/history/history-list-view";

type LatestRun = {
  id: string;
  status: string;
  createdAt: string;
  reportMode: ReportModeApi;
};

type ResearchRow = {
  id: string;
  topic: string;
  displayTitle?: string | null;
  updatedAt: string;
  latestRun: LatestRun | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HistoryListBody() {
  const searchParams = useSearchParams();
  const archivedMode = isHistoryArchivedView(searchParams);

  const [researches, setResearches] = useState<ResearchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResearches(null);
    setError(null);
    const url = historyJobsListUrl(archivedMode);
    void (async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const t = await res.text();
        let msg = t || res.statusText;
        try {
          const j = JSON.parse(t) as { error?: string; code?: string };
          if (j.code === "MISSING_SESSION_SECRET" || j.code === "MISSING_DATABASE_URL") {
            msg = "Server configuration error. Check Vercel environment variables.";
          } else if (j.error) msg = j.error;
        } catch {
          /* plain text */
        }
        setError(msg);
        return;
      }
      const data = (await res.json()) as { researches: ResearchRow[] };
      setResearches(data.researches);
    })();
  }, [archivedMode]);

  if (error) {
    return (
      <>
        <h1 className="page-title">History</h1>
        <p className="error">{error}</p>
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/">Back to home</Link>
          {" · "}
          <Link href="/history">Active threads</Link>
          {archivedMode ? null : (
            <>
              {" · "}
              <Link href={historyArchivedListPath()}>Archived threads</Link>
            </>
          )}
        </p>
      </>
    );
  }

  if (!researches) {
    return (
      <>
        <h1 className="page-title">History</h1>
        <div className="loading-block muted">Loading History…</div>
      </>
    );
  }

  if (researches.length === 0 && !archivedMode) {
    return (
      <>
        <h1 className="page-title">History</h1>
        <div className="empty-state">
          <p className="muted" style={{ margin: 0 }}>
            No threads in History yet for this browser.
          </p>
          <p className="muted">Add a topic from the home page—data stays with this session only.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
            Run research
          </Link>
        </div>
        <p className="muted" style={{ marginTop: "1.5rem", fontSize: "0.88rem" }}>
          <Link href={historyArchivedListPath()}>Archived threads</Link>
        </p>
      </>
    );
  }

  if (researches.length === 0 && archivedMode) {
    return (
      <>
        <p style={{ marginBottom: "0.75rem" }}>
          <Link href="/history" className="muted" style={{ fontSize: "0.92rem" }}>
            ← Active threads
          </Link>
        </p>
        <h1 className="page-title">Archived threads</h1>
        <div className="empty-state">
          <p className="muted" style={{ margin: 0 }}>
            No archived threads.
          </p>
          <p className="muted" style={{ marginTop: "0.35rem" }}>
            Archive from the thread page to hide it here until you need it again.
          </p>
          <Link href="/history" className="btn btn-secondary" style={{ marginTop: "1rem", display: "inline-flex" }}>
            Back to active threads
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {archivedMode ? (
        <p style={{ marginBottom: "0.75rem" }}>
          <Link href="/history" className="muted" style={{ fontSize: "0.92rem" }}>
            ← Active threads
          </Link>
        </p>
      ) : null}
      <h1 className="page-title">{archivedMode ? "Archived threads" : "History"}</h1>
      <p className="page-lead muted">
        {archivedMode
          ? "Archived threads, newest activity first. Open a row to see that thread and its saved runs."
          : "Your threads, newest activity first. Open a row for saved runs; start another run from the thread page."}
      </p>
      {!archivedMode ? (
        <p className="muted" style={{ marginTop: "0.15rem", fontSize: "0.88rem" }}>
          <Link href={historyArchivedListPath()}>Archived threads</Link>
        </p>
      ) : null}
      <ul className="history-list" style={{ marginTop: "1rem" }}>
        {researches.map((r) => (
          <li key={r.id}>
            <Link href={`/research/${r.id}`} className="history-card">
              <p className="history-card-title">{r.displayTitle?.trim() || r.topic}</p>
              <div className="history-card-meta">
                {r.latestRun ? (
                  <>
                    <StatusBadge status={r.latestRun.status} />
                    <span className="report-mode-pill">{reportModeLabel(r.latestRun.reportMode)}</span>
                    <span className="history-time">{formatTime(r.latestRun.createdAt)}</span>
                  </>
                ) : (
                  <span className="muted" style={{ fontSize: "0.88rem" }}>
                    No runs yet
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function HistoryPage() {
  return (
    <div className="product-hero-block">
      <Suspense
        fallback={
          <>
            <h1 className="page-title">History</h1>
            <div className="loading-block muted">Loading History…</div>
          </>
        }
      >
        <HistoryListBody />
      </Suspense>
    </div>
  );
}
