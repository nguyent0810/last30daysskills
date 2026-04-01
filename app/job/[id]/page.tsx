"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { GeminiSummaryPanel } from "@/components/GeminiSummaryPanel";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReportModeApi } from "@/lib/report-mode";
import { reportModeLabel } from "@/lib/report-mode";

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
  geminiAvailable?: boolean;
};

function sourceLabel(s: string): string {
  if (s === "hn") return "Hacker News";
  if (s === "polymarket") return "Polymarket";
  if (s === "reddit") return "Reddit";
  return s;
}

function sourceRowMeta(r: SourceRun): { count: string; note: string; noteClass: string } {
  if (r.status === "failed") {
    return {
      count: "—",
      note: r.error ?? "Request or parse failed",
      noteClass: "source-note source-note--error",
    };
  }
  if (r.itemCount === 0) {
    return {
      count: "0",
      note: "No items matched this topic for this source.",
      noteClass: "source-empty",
    };
  }
  return {
    count: String(r.itemCount),
    note: "—",
    noteClass: "source-note",
  };
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
      <div>
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
      <div>
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

  return (
    <div>
      <p className="breadcrumb">
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/history">History</Link>
      </p>

      <h1 className="page-title">{j.topic}</h1>

      <div className="job-meta">
        <StatusBadge status={j.status} />
        {!terminal && <span className="muted">Checking for updates every few seconds…</span>}
        {terminal && j.status === "succeeded" && (
          <span className="report-mode-pill">Report: {reportModeLabel(data.reportMode)}</span>
        )}
      </div>

      {j.error && (
        <p className="error">
          <strong>Job could not complete:</strong> {j.error}
        </p>
      )}

      <h2 className="section-title">Sources</h2>
      <p className="section-hint muted">
        Each source runs independently. Partial failures are OK if another source produced items.
      </p>
      {!terminal && data.sourceRuns.length === 0 ? (
        <p className="muted">Waiting for the worker to fetch sources…</p>
      ) : (
        <div className="source-table-wrap">
          <table className="source-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Items</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.sourceRuns.map((r) => {
                const meta = sourceRowMeta(r);
                return (
                  <tr key={r.source}>
                    <td>{sourceLabel(r.source)}</td>
                    <td>
                      <span className={r.status === "succeeded" ? "badge badge-ok" : "badge badge-fail"}>
                        {r.status === "succeeded" ? "OK" : "Failed"}
                      </span>
                    </td>
                    <td>{meta.count}</td>
                    <td className={meta.noteClass}>{meta.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Report</h2>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" disabled={!canCopy} onClick={() => void copyReport()}>
          Copy report
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={rerunLoading || !j.topic}
          onClick={() => void rerunResearch()}
        >
          {rerunLoading ? "Starting…" : "Rerun same topic"}
        </button>
        <Link href="/history" className="btn btn-ghost">
          Back to history
        </Link>
      </div>
      {copyMsg && <p className="copy-toast">{copyMsg}</p>}

      {data.report ? (
        <article className="report-md">
          <ReactMarkdown>{data.report}</ReactMarkdown>
        </article>
      ) : (
        <p className="muted">{terminal ? "No report was stored for this job." : "Report appears when the job finishes."}</p>
      )}

      <GeminiSummaryPanel
        jobId={id}
        enabled={Boolean(j.status === "succeeded" && data.report?.trim())}
        geminiConfigured={data.geminiAvailable ?? false}
      />
    </div>
  );
}
