"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { MouseEvent } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DURATION_FAST_S, SHELL_EASE, staggerDelay } from "@/lib/motion/shell";
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
  insightLine?: string | null;
};

type ResearchRow = {
  id: string;
  topic: string;
  displayTitle?: string | null;
  updatedAt: string;
  runCount?: number;
  newLinksSincePriorRun?: number | null;
  latestRun: LatestRun | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HistoryThreadRow({
  r,
  index,
  archivedMode,
  onRemoveFromList,
}: {
  r: ResearchRow;
  index: number;
  archivedMode: boolean;
  onRemoveFromList: (id: string) => void;
}) {
  const router = useRouter();
  const [runBusy, setRunBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const label = r.displayTitle?.trim() || r.topic;
  const runCount = r.runCount ?? 0;

  async function runAgain(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setRowError(null);
    setRunBusy(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ researchId: r.id }),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = t || res.statusText;
        try {
          const j = JSON.parse(t) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* plain */
        }
        setRowError(msg);
        return;
      }
      const j = (await res.json()) as { id: string };
      router.push(`/job/${j.id}`);
    } finally {
      setRunBusy(false);
    }
  }

  async function setArchived(archived: boolean) {
    setRowError(null);
    setArchiveBusy(true);
    try {
      const res = await fetch(`/api/research/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text || res.statusText;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* plain */
        }
        setRowError(msg);
        return;
      }
      onRemoveFromList(r.id);
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION_FAST_S,
        ease: SHELL_EASE,
        delay: staggerDelay(index),
      }}
      whileHover={{ y: -2 }}
      style={{ willChange: "transform" }}
    >
      <div className="thread-history-card">
        <Link href={`/research/${r.id}`} className="thread-history-card__main">
          <p className="thread-history-card__title">{label}</p>
          {r.latestRun?.insightLine ? (
            <p className="thread-history-card__insight">{r.latestRun.insightLine}</p>
          ) : null}
          <div className="thread-history-card__meta">
            <span className="muted">Last run · {r.latestRun ? formatTime(r.latestRun.createdAt) : "—"}</span>
            <span className="muted">
              {runCount} {runCount === 1 ? "run" : "runs"}
            </span>
            {r.latestRun ? (
              <>
                <StatusBadge status={r.latestRun.status} />
                <span className="report-mode-pill">{reportModeLabel(r.latestRun.reportMode)}</span>
              </>
            ) : (
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                No runs yet
              </span>
            )}
            {r.newLinksSincePriorRun != null && r.newLinksSincePriorRun > 0 ? (
              <span className="thread-history-card__retention">
                {r.newLinksSincePriorRun} new link{r.newLinksSincePriorRun === 1 ? "" : "s"} since prior run
              </span>
            ) : null}
          </div>
        </Link>
        <div className="thread-history-card__actions">
          <Link href={`/research/${r.id}`} className="btn btn-secondary btn--sm">
            Open thread
          </Link>
          <button
            type="button"
            className="btn btn-secondary btn--sm"
            disabled={runBusy}
            onClick={(e) => void runAgain(e)}
          >
            {runBusy ? "Starting…" : "Run again"}
          </button>
          <Link href={`/research/${r.id}?rename=1`} className="btn btn-ghost btn--sm">
            Rename
          </Link>
          {archivedMode ? (
            <button
              type="button"
              className="btn btn-ghost btn--sm"
              disabled={archiveBusy}
              onClick={() => void setArchived(false)}
            >
              {archiveBusy ? "Updating…" : "Unarchive"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn--sm"
              disabled={archiveBusy}
              onClick={() => void setArchived(true)}
            >
              {archiveBusy ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
        {rowError ? (
          <p className="error" style={{ margin: 0, fontSize: "0.85rem" }}>
            {rowError}
          </p>
        ) : null}
      </div>
    </motion.li>
  );
}

function HistoryListBody() {
  const searchParams = useSearchParams();
  const archivedMode = isHistoryArchivedView(searchParams);

  const [researches, setResearches] = useState<ResearchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const removeThreadFromList = useCallback((tid: string) => {
    setResearches((prev) => (prev ? prev.filter((x) => x.id !== tid) : prev));
  }, []);

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
            Archive from the list or a thread page to hide threads here until you need them again.
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
          ? "Archived threads, newest activity first. Open one to see its runs."
          : "Threads with the latest activity first. Open a thread for its runs, or run again from a row."}
      </p>
      {!archivedMode ? (
        <p className="muted" style={{ marginTop: "0.15rem", fontSize: "0.88rem" }}>
          <Link href={historyArchivedListPath()}>Archived threads</Link>
        </p>
      ) : null}
      <ul className="history-list" style={{ marginTop: "1rem" }}>
        {researches.map((r, index) => (
          <HistoryThreadRow
            key={r.id}
            r={r}
            index={index}
            archivedMode={archivedMode}
            onRemoveFromList={removeThreadFromList}
          />
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
