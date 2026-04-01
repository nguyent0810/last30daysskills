"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

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
  sourceRuns: SourceRun[];
};

function sourceLabel(s: string): string {
  if (s === "hn") return "Hacker News";
  if (s === "polymarket") return "Polymarket";
  if (s === "reddit") return "Reddit";
  return s;
}

export default function JobPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/jobs/${id}`, { credentials: "include" });
    if (res.status === 401) {
      setError("No session. Open the home page once, then try again.");
      return;
    }
    if (!res.ok) {
      setError(await res.text());
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

  if (!id) {
    return <p>Invalid job.</p>;
  }

  if (error) {
    return (
      <div>
        <p className="error">{error}</p>
        <p>
          <Link href="/">Home</Link>
        </p>
      </div>
    );
  }

  if (!data) {
    return <p>Loading…</p>;
  }

  const j = data.job;
  const terminal = j.status === "succeeded" || j.status === "failed";

  return (
    <div>
      <p className="muted">
        <Link href="/">← New research</Link> · <Link href="/history">History</Link>
      </p>
      <h1>{j.topic}</h1>
      <p>
        <strong>Status:</strong> {j.status}
        {!terminal && " (updating…)"}
      </p>
      {j.error && (
        <p className="error">
          <strong>Job error:</strong> {j.error}
        </p>
      )}

      <h2>Sources</h2>
      <p className="muted">What ran for this job (partial failures are OK if another source worked).</p>
      <table className="source-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Result</th>
            <th>Items stored</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {data.sourceRuns.map((r) => (
            <tr key={r.source}>
              <td>{sourceLabel(r.source)}</td>
              <td>
                <span className={r.status === "succeeded" ? "badge badge-ok" : "badge badge-fail"}>
                  {r.status}
                </span>
              </td>
              <td>{r.itemCount}</td>
              <td style={{ fontSize: "0.85rem" }}>{r.error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Report</h2>
      {data.report ? (
        <article className="report-md">
          <ReactMarkdown>{data.report}</ReactMarkdown>
        </article>
      ) : (
        <p className="muted">{terminal ? "No report stored." : "Report will appear when the job finishes."}</p>
      )}
    </div>
  );
}
