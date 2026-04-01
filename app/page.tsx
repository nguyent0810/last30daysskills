"use client";

import { useCallback, useState } from "react";

type JobStatus = {
  job: {
    id: string;
    topic: string;
    status: string;
    error: string | null;
  };
  report: string | null;
  sourceRuns: { source: string; status: string; error: string | null; itemCount: number }[];
};

export default function Home() {
  const [topic, setTopic] = useState("typescript");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const poll = useCallback(async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const data = (await res.json()) as JobStatus;
    setStatus(data);
    if (data.job.status === "queued" || data.job.status === "running") {
      setTimeout(() => void poll(id), 2000);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const data = (await res.json()) as { id: string; status: string };
      setJobId(data.id);
      void poll(data.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Research — Phase 1A</h1>
      <p>Submit a topic. A worker process must be running with DATABASE_URL.</p>
      <form onSubmit={submit}>
        <label>
          Topic{" "}
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ width: "100%", maxWidth: "24rem" }}
          />
        </label>
        <div style={{ marginTop: "0.5rem" }}>
          <button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create job"}
          </button>
        </div>
      </form>
      {jobId && <p>Job id: {jobId}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {status && (
        <section style={{ marginTop: "1rem" }}>
          <h2>Status</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(status.job, null, 2)}</pre>
          <h3>Source runs</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(status.sourceRuns, null, 2)}</pre>
          <h3>Report</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{status.report ?? "(not ready)"}</pre>
        </section>
      )}
    </main>
  );
}
