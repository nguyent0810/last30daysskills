"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { EditorialDigest } from "@/components/EditorialDigest";
import { GeminiSummaryPanel } from "@/components/GeminiSummaryPanel";
import { StatusBadge } from "@/components/StatusBadge";
import type { DigestItem } from "@/lib/job-page/editorial-digest";
import { factualInsightLine, mainInsightLine, runningHeroLines } from "@/lib/job-page/hero-insight";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";
import {
  sourceCardStatus,
  sourceCardStatusLabel,
  sourceInterpretation,
} from "@/lib/job-page/source-interpretation";

type SourceRun = {
  source: string;
  status: string;
  error: string | null;
  itemCount: number;
};

type JobPayload = {
  job: {
    id: string;
    topic: string;
    status: string;
    error: string | null;
    createdAt: string;
    updatedAt: string;
  };
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
    const json = (await res.json()) as JobPayload;
    setData(json);
    setError(null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function copyReport() {
    if (!data?.report) return;
    try {
      await navigator.clipboard.writeText(data.report);
      setCopyMsg("Copied to clipboard");
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Could not copy — select text manually");
      setTimeout(() => setCopyMsg(null), 3000);
    }
  }

  async function rerunResearch() {
    if (!data?.job.topic) return;
    setRerunLoading(true);
    setCopyMsg(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: data.job.topic }),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || "Could not start a new run");
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
      <div>
        <p className="error">Invalid job link.</p>
        <Link href="/">Home</Link>
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
        <div className="loading-block muted">Loading job…</div>
      </div>
    );
  }

  const j = data.job;
  const terminal = j.status === "succeeded" || j.status === "failed";
  const canCopy = Boolean(data.report && j.status === "succeeded");
  const digestItems = data.items ?? [];
  const showDigest = terminal && j.status === "succeeded" && digestItems.length > 0;

  const running = j.status === "queued" || j.status === "running";
  const heroRunning = runningHeroLines(j.topic);
  const heroMain = running ? heroRunning.main : mainInsightLine(j.topic, orderedRuns);
  const heroFactual = running ? heroRunning.factual : factualInsightLine(orderedRuns);

  return (
    <div className="page-shell job-page">
      <p className="breadcrumb">
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/history">History</Link>
      </p>

      <div className="job-hero">
        <p className="job-hero__main">{heroMain}</p>
        <p className="job-hero__factual">{heroFactual}</p>
      </div>

      <h1 className="page-title job-page__title">{j.topic}</h1>

      <div className="job-meta">
        <StatusBadge status={j.status} />
        {!terminal && <span className="muted">Updates every few seconds.</span>}
        {terminal && j.status === "succeeded" && (
          <span className="report-mode-pill">Report: {reportModeLabel(data.reportMode)}</span>
        )}
      </div>

      {j.error && (
        <p className="error job-page__job-error">
          <strong>Job could not complete:</strong> {j.error}
        </p>
      )}

      <h2 className="section-title">Sources</h2>
      <p className="section-hint muted">Each source runs on its own. Partial failures are OK if another source delivered items.</p>

      {!terminal && orderedRuns.length === 0 ? (
        <p className="muted">Waiting for the worker…</p>
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
                <p className="source-card__interpret">{sourceInterpretation(r)}</p>
              </div>
            );
          })}
        </div>
      )}

      {showDigest ? <EditorialDigest items={digestItems} /> : null}

      <div className="report-section">
        <div className="report-section__head">
          <h2 className="section-title report-section__title">Full report</h2>
          <div className="job-toolbar">
            <button type="button" className="btn btn-secondary" disabled={!canCopy} onClick={() => void copyReport()}>
              Copy report
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={rerunLoading || !j.topic}
              onClick={() => void rerunResearch()}
            >
              {rerunLoading ? "Starting…" : "Rerun topic"}
            </button>
            <Link href="/history" className="btn btn-ghost">
              History
            </Link>
          </div>
        </div>
        {copyMsg && <p className="copy-toast">{copyMsg}</p>}

        {data.report ? (
          <article className="report-md report-md--shell">
            <ReactMarkdown>{data.report}</ReactMarkdown>
          </article>
        ) : (
          <p className="muted">
            {terminal ? "No report was stored for this job." : "Report appears when the job finishes."}
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
