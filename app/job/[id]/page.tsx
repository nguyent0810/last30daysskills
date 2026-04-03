"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DURATION_FAST_S, SHELL_EASE } from "@/lib/motion/shell";
import ReactMarkdown from "react-markdown";
import { EditorialDigest } from "@/components/EditorialDigest";
import { GeminiSummaryPanel } from "@/components/GeminiSummaryPanel";
import { StatusBadge } from "@/components/StatusBadge";
import type { DigestItem } from "@/lib/job-page/editorial-digest";
import {
  FAILED_RUN_HERO_MAIN,
  factualInsightLine,
  mainInsightLine,
  runningHeroLines,
} from "@/lib/job-page/hero-insight";
import { buildReuseMarkdown } from "@/lib/job-page/build-reuse-markdown";
import { buildReportPreview } from "@/lib/job-page/report-preview";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";
import {
  sourceCardStatus,
  sourceCardStatusLabel,
  sourceInterpretation,
} from "@/lib/job-page/source-interpretation";
import { threadOrientationForUi } from "@/lib/jobs/job-detail-thread";

type SourceRun = {
  source: string;
  status: string;
  error: string | null;
  itemCount: number;
};

type JobPayload = {
  job: {
    id: string;
    researchId: string | null;
    topic: string;
    status: string;
    error: string | null;
    createdAt: string;
    updatedAt: string;
  };
  thread: { id: string; topic: string; displayTitle: string | null } | null;
  report: string | null;
  reportMode: ReportModeApi;
  sourceRuns: SourceRun[];
  items?: DigestItem[];
  geminiAvailable?: boolean;
};

const SOURCE_ORDER = ["hn", "polymarket", "reddit"] as const;

function sourceLabel(s: string): string {
  if (s === "hn") return "Hacker News";
  if (s === "polymarket") return "Polymarket";
  if (s === "reddit") return "Reddit";
  return s;
}

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/jobs/${id}`, { credentials: "include" });
    if (res.status === 401) {
      setError("No session. Open the home page once, then return here.");
      return;
    }
    if (!res.ok) {
      const raw = await res.text();
      try {
        const j = JSON.parse(raw) as { error?: string; code?: string };
        if (j.code === "MISSING_SESSION_SECRET" || j.code === "MISSING_DATABASE_URL") {
          setError("Server configuration error. Check Vercel environment variables.");
        } else {
          setError(j.error ?? (raw || res.statusText));
        }
      } catch {
        setError(raw || res.statusText);
      }
      return;
    }
    const raw = (await res.json()) as JobPayload & { thread?: JobPayload["thread"] };
    setData({ ...raw, thread: raw.thread ?? null });
    setError(null);
    setRerunError(null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReportExpanded(false);
  }, [id, data?.report]);

  useEffect(() => {
    if (!data) return;
    if (data.job.status === "queued" || data.job.status === "running") {
      const t = setTimeout(() => void load(), 2000);
      return () => clearTimeout(t);
    }
  }, [data, load]);

  const orderedRuns = useMemo(() => {
    if (!data?.sourceRuns) return [];
    const map = new Map(data.sourceRuns.map((r) => [r.source, r]));
    return SOURCE_ORDER.map((key) => map.get(key)).filter(Boolean) as SourceRun[];
  }, [data?.sourceRuns]);

  const reportPreview = useMemo(
    () => (data?.report ? buildReportPreview(data.report) : null),
    [data?.report]
  );

  async function copyReport() {
    if (!data) return;
    const text = data.report?.trim() ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Report copied");
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Could not copy — select text manually");
      setTimeout(() => setCopyMsg(null), 3000);
    }
  }

  function downloadMarkdown() {
    if (!data) return;
    const reportTrim = data.report?.trim() ?? "";
    const items = data.items ?? [];
    if (!reportTrim && items.length === 0) return;
    const md = buildReuseMarkdown({
      topic: data.job.topic,
      createdAt: data.job.createdAt,
      report: data.report,
      items: items.map((it) => ({ title: it.title, url: it.url })),
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-run-${data.job.id}.md`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function rerunResearch() {
    if (!data?.job.topic) return;
    setRerunLoading(true);
    setCopyMsg(null);
    setRerunError(null);
    try {
      const body =
        data.job.researchId != null
          ? { researchId: data.job.researchId }
          : { topic: data.job.topic };
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = t || "Could not start your run";
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
        <p className="error">Invalid run link.</p>
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
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/">Home</Link>
          {" · "}
          <Link href="/history">History</Link>
        </p>
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
        <div className="loading-block muted">Loading run…</div>
      </div>
    );
  }

  const j = data.job;
  const terminal = j.status === "succeeded" || j.status === "failed";
  const reportTrim = (data.report?.trim() ?? "").length > 0;
  const hasItems = (data.items?.length ?? 0) > 0;
  const canCopyReport = terminal && reportTrim;
  const canDownloadMarkdown = terminal && (reportTrim || hasItems);
  const digestItems = data.items ?? [];
  const showDigest = terminal && j.status === "succeeded" && digestItems.length > 0;

  const running = j.status === "queued" || j.status === "running";
  const heroRunning = runningHeroLines(j.topic);
  const heroTopItems =
    digestItems.length > 0
      ? digestItems.map((it) => ({ title: it.title, snippet: it.snippet }))
      : undefined;
  const heroMain = running ? heroRunning.main : mainInsightLine(j.topic, orderedRuns, heroTopItems);
  const heroFactual = running ? heroRunning.factual : factualInsightLine(orderedRuns);

  const threadUi = threadOrientationForUi(data.thread);

  const reportMarkdown =
    data.report && (reportExpanded || !reportPreview?.hasMore) ? data.report : (reportPreview?.collapsed ?? data.report ?? null);

  return (
    <div className="page-shell job-page">
      <p className="breadcrumb">
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/history">History</Link>
        {j.researchId ? (
          <>
            {" · "}
            <Link href={`/research/${j.researchId}`}>Thread</Link>
          </>
        ) : null}
      </p>

      <div className="job-hero">
        <p className="job-hero__main">{heroMain}</p>
        <p className="job-hero__factual">{heroFactual}</p>
      </div>

      <h1 className="page-title job-page__title">{j.topic}</h1>

      {threadUi ? (
        <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.92rem" }}>
          Thread:{" "}
          <Link href={threadUi.href}>{threadUi.label}</Link>
        </p>
      ) : null}

      <div className="job-meta">
        <motion.span
          key={j.status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION_FAST_S, ease: SHELL_EASE }}
          style={{ display: "inline-block" }}
        >
          <StatusBadge status={j.status} />
        </motion.span>
        {!terminal && <span className="muted">Updates every few seconds.</span>}
        {terminal && j.status === "succeeded" && (
          <span className="report-mode-pill">Report: {reportModeLabel(data.reportMode)}</span>
        )}
      </div>

      {j.error && (
        <p className="error job-page__job-error">
          <strong>This run could not complete:</strong> {j.error}
        </p>
      )}

      <h2 className="section-title">Sources</h2>
      <p className="section-hint muted">Each source runs on its own. Partial failures are OK if another source delivered items.</p>

      {!terminal && orderedRuns.length === 0 ? (
        <p className="muted">Gathering sources…</p>
      ) : (
        <div className="source-cards">
          {orderedRuns.map((r) => {
            const st = sourceCardStatus(r);
            const badgeClass =
              st === "failed" ? "source-card__badge source-card__badge--fail" : st === "empty" ? "source-card__badge source-card__badge--empty" : "source-card__badge source-card__badge--ok";
            return (
              <div key={r.source} className="source-card">
                <div className="source-card__head">
                  <span className="source-card__name">{sourceLabel(r.source)}</span>
                  <span className={badgeClass}>{sourceCardStatusLabel(st)}</span>
                </div>
                <div className="source-card__count">
                  {r.status === "failed" ? (
                    <span className="muted">—</span>
                  ) : (
                    <>
                      {r.itemCount} {r.itemCount === 1 ? "item" : "items"}
                    </>
                  )}
                </div>
                <p className="source-card__interpret">{sourceInterpretation(r, j.topic)}</p>
              </div>
            );
          })}
        </div>
      )}

      {showDigest ? <EditorialDigest items={digestItems} /> : null}

      <div className="report-section">
        <div className="report-section__head">
          <h2 className="section-title report-section__title">Report</h2>
          <div className="job-toolbar">
            <motion.button
              type="button"
              className="btn btn-secondary"
              disabled={!canCopyReport}
              title="Copy the report body only (markdown as stored)"
              onClick={() => void copyReport()}
              whileTap={canCopyReport ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.12, ease: SHELL_EASE }}
            >
              Copy report
            </motion.button>
            <motion.button
              type="button"
              className="btn btn-secondary"
              disabled={!canDownloadMarkdown}
              title="Download topic, full report, and source links as a Markdown file"
              onClick={() => downloadMarkdown()}
              whileTap={canDownloadMarkdown ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.12, ease: SHELL_EASE }}
            >
              Download Markdown
            </motion.button>
            <motion.button
              type="button"
              className="btn btn-secondary"
              disabled={rerunLoading || !j.topic || running}
              onClick={() => void rerunResearch()}
              whileTap={!(rerunLoading || !j.topic || running) ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.12, ease: SHELL_EASE }}
            >
              {rerunLoading
                ? "Starting your run…"
                : j.researchId
                  ? "Start new run"
                  : "Run research"}
            </motion.button>
            <motion.span whileTap={{ scale: 0.98 }} transition={{ duration: 0.12, ease: SHELL_EASE }} style={{ display: "inline-block" }}>
              <Link href="/history" className="btn btn-ghost">
                History
              </Link>
            </motion.span>
          </div>
          {running ? (
            <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.88rem" }}>
              This run is still in progress.
            </p>
          ) : null}
        </div>
        {copyMsg && <p className="copy-toast">{copyMsg}</p>}
        {rerunError ? <p className="error" style={{ marginTop: "0.35rem" }}>{rerunError}</p> : null}
        {data.report && reportPreview?.hasMore && !reportExpanded ? (
          <p className="section-hint muted report-section__hint">Showing the top findings first — expand for sources and the complete write-up.</p>
        ) : null}

        {data.report && reportMarkdown ? (
          <>
            <article className="report-md report-md--shell">
              <ReactMarkdown>{reportMarkdown}</ReactMarkdown>
            </article>
            {reportPreview?.hasMore ? (
              <div className="report-expand">
                <motion.button
                  type="button"
                  className="btn btn-ghost report-expand__btn"
                  onClick={() => setReportExpanded((e) => !e)}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.12, ease: SHELL_EASE }}
                >
                  {reportExpanded ? "Show condensed view" : "Show full report"}
                </motion.button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted">
            {terminal ? "No report was stored for this run." : "Report appears when the run finishes."}
          </p>
        )}
      </div>

      <GeminiSummaryPanel
        jobId={id}
        enabled={Boolean(j.status === "succeeded" && data.report?.trim())}
        geminiConfigured={data.geminiAvailable ?? false}
      />
    </div>
  );
}
