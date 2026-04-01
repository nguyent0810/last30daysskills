"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type JobRow = {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
};

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/jobs", { credentials: "include" });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const data = (await res.json()) as { jobs: JobRow[] };
      setJobs(data.jobs);
    })();
  }, []);

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!jobs) {
    return <p>Loading…</p>;
  }

  if (jobs.length === 0) {
    return (
      <div>
        <h1>History</h1>
        <p className="muted">No jobs yet for this browser session. Start one from the home page.</p>
        <p>
          <Link href="/">New research</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>History</h1>
      <p className="muted">Jobs for this browser session (anonymous cookie).</p>
      <ul className="history-list">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link href={`/job/${j.id}`}>{j.topic}</Link>
            <span className="muted">
              {" "}
              — {j.status} — {new Date(j.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
