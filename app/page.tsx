"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = [
  "Rust async programming",
  "Climate tech startups",
  "EU AI Act",
  "PostgreSQL vs Neon",
  "Polymarket prediction markets",
];

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
        let msg = t || res.statusText;
        try {
          const j = JSON.parse(t) as { code?: string; error?: string };
          if (j.code === "MISSING_SESSION_SECRET" || j.code === "MISSING_DATABASE_URL") {
            msg = "Server configuration error. Check Vercel env (DATABASE_URL, SESSION_SECRET).";
          } else if (j.error) msg = j.error;
        } catch {
          /* plain text */
        }
        setError(msg);
        return;
      }
      const data = (await res.json()) as { id: string };
      router.push(`/job/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="product-hero-block">
      <h1 className="page-title">New research</h1>
      <p className="page-lead muted">
        Enter a topic. We aggregate public signals from Hacker News, Polymarket, and Reddit — no sign-in
        required. A background worker completes the run in the background.
      </p>
      <form className="product-surface" onSubmit={submit}>
        <label className="field-label" htmlFor="topic">
          Topic
        </label>
        <textarea
          id="topic"
          className="topic-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What do you want a snapshot of? e.g. “Stable diffusion licensing news”"
          autoComplete="off"
          disabled={loading}
          maxLength={500}
        />
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
          {topic.length}/500 characters
        </p>
        <div className="suggestions" aria-label="Suggested topics">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="suggestion-chip"
              onClick={() => setTopic(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="form-row btn-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Starting research…" : "Run research"}
          </button>
          <Link href="/history" className="btn btn-ghost">
            View history
          </Link>
        </div>
      </form>
      {loading && (
        <p className="loading-block muted">
          Creating your job<span className="loading-dots" />
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
