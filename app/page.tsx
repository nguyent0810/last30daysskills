"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: topic.trim() || "news" }),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || res.statusText);
        return;
      }
      const data = (await res.json()) as { id: string };
      router.push(`/job/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>New research</h1>
      <p className="muted">
        Enter a topic. A worker process must be running with <code>DATABASE_URL</code>. Results use Hacker
        News, Polymarket, and public Reddit JSON — no OAuth.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="topic">Topic</label>
        <div className="form-row">
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Rust programming"
            autoComplete="off"
          />
        </div>
        <div className="form-row">
          <button type="submit" disabled={loading}>
            {loading ? "Starting…" : "Run research"}
          </button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
