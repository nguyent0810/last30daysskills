"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { DURATION_FAST_S, SHELL_EASE, shellTransitionMedium, staggerDelay } from "@/lib/motion/shell";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";

type RunRow = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reportMode: ReportModeApi;
  insightLine?: string | null;
  vsPreviousLine?: string | null;
};

type ThreadInsightPayload = {
  summaryLine: string;
  direction: "rising" | "flat" | "fading" | "sparse";
  sourceDominance: "reddit" | "hacker_news" | "mixed" | "weak";
};

type Payload = {
  research: {
    id: string;
    topic: string;
    displayTitle?: string | null;
    archivedAt?: string | null;
    isPinned: boolean;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  };
  runs: RunRow[];
  sincePreviousRun?: { newLinkCount: number } | null;
  threadInsight?: ThreadInsightPayload | null;
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

function ResearchPageBody() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/research/${id}`, { credentials: "include" });
    if (res.status === 401) {
      setError("No session. Open the home page once, then return here.");
      return;
    }
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
    const payload = (await res.json()) as Payload;
    setData(payload);
    setNoteDraft(payload.research.note ?? "");
    setError(null);
    setRerunError(null);
    setRenameOpen(false);
    setRenameError(null);
    setArchiveError(null);
    setMetaError(null);
  }, [id]);

  async function togglePin() {
    if (!id || !data) return;
    setPinBusy(true);
    setMetaError(null);
    try {
      const res = await fetch(`/api/research/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pinned: !data.research.isPinned }),
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
        setMetaError(msg);
        return;
      }
      const j = JSON.parse(text) as Payload["research"];
      setData((prev) => (prev ? { ...prev, research: j } : prev));
    } finally {
      setPinBusy(false);
    }
  }

  async function saveNote() {
    if (!id) return;
    const trimmed = noteDraft.trim();
    setNoteBusy(true);
    setMetaError(null);
    try {
      const res = await fetch(`/api/research/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: trimmed.length ? trimmed : null }),
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
        setMetaError(msg);
        return;
      }
      const j = JSON.parse(text) as Payload["research"];
      setData((prev) => (prev ? { ...prev, research: j } : prev));
      setNoteDraft(j.note ?? "");
    } finally {
      setNoteBusy(false);
    }
  }

  async function setArchived(archived: boolean) {
    if (!id) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const res = await fetch(`/api/research/${id}`, {
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
        setArchiveError(msg);
        return;
      }
      const j = JSON.parse(text) as Payload["research"];
      setData((prev) => (prev ? { ...prev, research: j } : prev));
    } finally {
      setArchiveBusy(false);
    }
  }

  function openRename() {
    if (!data) return;
    setRenameDraft(data.research.displayTitle ?? "");
    setRenameError(null);
    setRenameOpen(true);
  }

  function cancelRename() {
    setRenameOpen(false);
    setRenameError(null);
  }

  async function saveRename() {
    if (!id) return;
    const trimmed = renameDraft.trim();
    if (trimmed.length === 0) {
      setRenameError("Enter a title, or use Clear label to show the topic again.");
      return;
    }
    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/research/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayTitle: trimmed }),
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
        setRenameError(msg);
        return;
      }
      const j = JSON.parse(text) as Payload["research"];
      setData((prev) => (prev ? { ...prev, research: j } : prev));
      setRenameOpen(false);
    } finally {
      setRenameBusy(false);
    }
  }

  async function clearDisplayTitle() {
    if (!id) return;
    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/research/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayTitle: null }),
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
        setRenameError(msg);
        return;
      }
      const j = JSON.parse(text) as Payload["research"];
      setData((prev) => (prev ? { ...prev, research: j } : prev));
      setRenameOpen(false);
    } finally {
      setRenameBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("rename") !== "1" || !data || !id) return;
    setRenameDraft(data.research.displayTitle ?? "");
    setRenameError(null);
    setRenameOpen(true);
    router.replace(`/research/${id}`, { scroll: false });
  }, [searchParams, data, id, router]);

  async function rerunTopic() {
    if (!id) return;
    setRerunLoading(true);
    setRerunError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ researchId: id }),
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
        setRerunError(msg);
        return;
      }
      const j = (await res.json()) as { id: string };
      router.push(`/job/${j.id}`);
    } finally {
      setRerunLoading(false);
    }
  }

  if (!id) {
    return (
      <div className="page-shell">
        <p className="breadcrumb">
          <Link href="/">Home</Link>
          {" · "}
          <Link href="/history">History</Link>
        </p>
        <p className="error">Invalid link.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <p className="breadcrumb">
          <Link href="/">Home</Link>
          {" · "}
          <Link href="/history">History</Link>
        </p>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-shell">
        <p className="breadcrumb">
          <Link href="/">Home</Link>
          {" · "}
          <Link href="/history">History</Link>
        </p>
        <div className="loading-block muted">Loading thread…</div>
      </div>
    );
  }

  const r = data.research;
  const threadLabel = r.displayTitle?.trim() || r.topic;
  const isArchived = r.archivedAt != null && r.archivedAt.length > 0;

  return (
    <div className="page-shell">
      <p className="breadcrumb">
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/history">History</Link>
        {" · "}
        <span className="muted">Thread</span>
      </p>

      {isArchived ? (
        <div
          className="muted"
          style={{
            marginTop: "0.5rem",
            marginBottom: "0.25rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid var(--border, #ccc)",
            background: "var(--surface-muted, rgba(0,0,0,0.04))",
            fontSize: "0.92rem",
          }}
        >
          <span style={{ fontWeight: 600 }}>This thread is archived.</span> It stays out of History until you unarchive or run again.
          <div style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={archiveBusy}
              onClick={() => void setArchived(false)}
            >
              {archiveBusy ? "Updating…" : "Unarchive"}
            </button>
          </div>
        </div>
      ) : null}

      {archiveError ? <p className="error" style={{ marginTop: "0.5rem" }}>{archiveError}</p> : null}

      <motion.header
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shellTransitionMedium}
        style={{ marginTop: "0.35rem" }}
      >
        <h1 className="page-title" style={{ marginBottom: "0.35rem" }}>
          {threadLabel}
        </h1>
        <p className="thread-page__topic">Topic: {r.topic}</p>
        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", maxWidth: "38rem" }}>
          Run again on the same topic, or open a saved run below.
        </p>
      </motion.header>

      {data.threadInsight ? (
        <div className="thread-insight-strip">
          <p className="thread-insight-strip__summary">{data.threadInsight.summaryLine}</p>
          {data.sincePreviousRun ? (
            <p className="thread-insight-strip__foot">
              {data.sincePreviousRun.newLinkCount} new link{data.sincePreviousRun.newLinkCount === 1 ? "" : "s"} since the previous run.
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

      <div className="thread-workflow">
        <div className="thread-workflow__pin-row">
          <button
            type="button"
            className="btn btn-ghost btn--sm"
            disabled={pinBusy}
            onClick={() => void togglePin()}
            aria-pressed={r.isPinned}
          >
            {pinBusy ? "Updating…" : r.isPinned ? "Unpin from History" : "Pin to top of History"}
          </button>
          {r.isPinned ? (
            <span className="thread-workflow__pinned-hint muted" style={{ fontSize: "0.8rem" }}>
              Pinned
            </span>
          ) : null}
        </div>
        <div className="thread-workflow-note">
          <label htmlFor="thread-why-note" className="muted" style={{ display: "block", fontSize: "0.88rem", marginBottom: "0.35rem" }}>
            Why this matters
          </label>
          <textarea
            id="thread-why-note"
            className="topic-input thread-workflow-note__input"
            rows={3}
            maxLength={500}
            placeholder="Short reminder: what you’re watching for, or why you’ll revisit."
            value={noteDraft}
            disabled={noteBusy}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
            {noteDraft.length}/500
          </p>
          <div style={{ marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-secondary btn--sm" disabled={noteBusy} onClick={() => void saveNote()}>
              {noteBusy ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
        {metaError ? <p className="error" style={{ marginTop: "0.5rem", fontSize: "0.88rem" }}>{metaError}</p> : null}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={rerunLoading}
          onClick={() => void rerunTopic()}
        >
          {rerunLoading ? "Starting…" : "Run again"}
        </button>
        {rerunError ? <p className="error" style={{ marginTop: "0.5rem" }}>{rerunError}</p> : null}
      </div>

      {renameOpen ? (
        <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border, #e5e5e5)" }}>
          <label htmlFor="thread-rename-input" className="muted" style={{ display: "block", fontSize: "0.88rem", marginBottom: "0.35rem" }}>
            Display title (topic for new runs stays the same)
          </label>
          <input
            id="thread-rename-input"
            type="text"
            style={{
              width: "100%",
              maxWidth: "32rem",
              padding: "0.5rem 0.65rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: "1px solid var(--border, #ccc)",
            }}
            maxLength={500}
            value={renameDraft}
            disabled={renameBusy}
            onChange={(e) => setRenameDraft(e.target.value)}
            placeholder={r.topic}
            autoFocus
          />
          <div style={{ marginTop: "0.65rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" className="btn btn-primary" disabled={renameBusy} onClick={() => void saveRename()}>
              {renameBusy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-secondary" disabled={renameBusy} onClick={() => cancelRename()}>
              Cancel
            </button>
            {r.displayTitle != null && r.displayTitle.trim().length > 0 ? (
              <button type="button" className="btn btn-secondary" disabled={renameBusy} onClick={() => void clearDisplayTitle()}>
                Clear label
              </button>
            ) : null}
          </div>
          <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem", maxWidth: "36rem" }}>
            Topic: <span style={{ fontStyle: "italic" }}>{r.topic}</span>
          </p>
          {renameError ? <p className="error" style={{ marginTop: "0.5rem" }}>{renameError}</p> : null}
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginTop: "0.85rem", fontSize: "0.88rem", maxWidth: "38rem" }}>
            Open a run below for its report and sources, or rename / archive this thread.
          </p>
          <div
            style={{
              marginTop: "0.65rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.35rem 0.75rem",
              alignItems: "center",
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={() => openRename()}>
              Rename thread
            </button>
            {!isArchived ? (
              <>
                <span className="muted" style={{ fontSize: "0.8rem", userSelect: "none" }} aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={archiveBusy}
                  onClick={() => void setArchived(true)}
                >
                  {archiveBusy ? "Updating…" : "Archive thread"}
                </button>
              </>
            ) : null}
          </div>
        </>
      )}

      <h2 className="section-title" style={{ marginTop: "2rem", paddingTop: "0.25rem" }}>
        Saved runs
      </h2>
      {data.runs.length === 0 ? (
        <div style={{ marginTop: "0.5rem", maxWidth: "38rem" }}>
          <p className="muted" style={{ margin: 0, fontWeight: 600 }}>
            No runs yet
          </p>
          <p className="muted" style={{ marginTop: "0.45rem", lineHeight: 1.5 }}>
            Use Run again above to fetch sources and build a report for this topic. You can return here anytime to open runs in this thread.
          </p>
        </div>
      ) : (
        <ul className="history-list" style={{ marginTop: "0.65rem" }}>
          {data.runs.map((run, runIndex) => (
            <motion.li
              key={run.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DURATION_FAST_S,
                ease: SHELL_EASE,
                delay: staggerDelay(runIndex),
              }}
              whileHover={{ y: -2 }}
              style={{ willChange: "transform" }}
            >
              <Link href={`/job/${run.id}`} className="history-card" style={{ display: "block" }}>
                <p className="history-card-title" style={{ marginBottom: "0.2rem" }}>
                  Run · {formatTime(run.createdAt)}
                </p>
                <div className="history-card-meta" style={{ gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <StatusBadge status={run.status} />
                  <span className="report-mode-pill">{reportModeLabel(run.reportMode)}</span>
                  {data.runs.length > 1 && runIndex === 0 ? (
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
                <span className="muted" style={{ fontSize: "0.82rem", marginTop: "0.35rem", display: "inline-block" }}>
                  Open run →
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <p className="breadcrumb">
            <Link href="/">Home</Link>
            {" · "}
            <Link href="/history">History</Link>
          </p>
          <div className="loading-block muted">Loading thread…</div>
        </div>
      }
    >
      <ResearchPageBody />
    </Suspense>
  );
}
