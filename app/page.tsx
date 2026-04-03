"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HOME_RECENT_JOBS_LIMIT, homeRecentJobsListUrl } from "@/lib/history/history-list-view";
import { readLocalGeminiApiKey } from "@/lib/ai/run-recap/byok-local";

type HomeRecentLatestRun = {
  id: string;
  status: string;
  createdAt: string;
  reportMode: string;
};

type HomeRecentResearch = {
  id: string;
  topic: string;
  displayTitle?: string | null;
  updatedAt: string;
  latestRun: HomeRecentLatestRun | null;
};

type HomeRecapState = {
  runId: string;
  loading: boolean;
  text: string | null;
  error: string | null;
  copyMsg: string | null;
};

function formatRecentThreadTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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
  const [recentThreads, setRecentThreads] = useState<HomeRecentResearch[] | null>(null);
  const [homeRecap, setHomeRecap] = useState<HomeRecapState | null>(null);
  const trimmedTopic = topic.trim();
  const canSubmit = trimmedTopic.length > 0 && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedTopic) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: trimmedTopic }),
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
      const data = (await res.json()) as { id: string; researchId?: string };
      router.push(`/job/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(homeRecentJobsListUrl(), { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          setRecentThreads([]);
          return;
        }
        const data = (await res.json()) as { researches: HomeRecentResearch[] };
        setRecentThreads(data.researches.slice(0, HOME_RECENT_JOBS_LIMIT));
      } catch {
        if (!cancelled) setRecentThreads([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runHomeRecap(runId: string) {
    const localGeminiKey = readLocalGeminiApiKey();
    setHomeRecap({
      runId,
      loading: true,
      text: null,
      error: null,
      copyMsg: null,
    });
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (localGeminiKey) {
        headers["X-Gemini-API-Key"] = localGeminiKey;
      }

      const res = await fetch(`/api/jobs/${runId}/ai-recap`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({}),
      });

      const raw = await res.text();
      let j: { text?: string; error?: string } = {};
      try {
        j = JSON.parse(raw) as typeof j;
      } catch {
        // keep j as {}
      }
      if (!res.ok) {
        setHomeRecap({
          runId,
          loading: false,
          text: null,
          error: j.error ?? raw ?? res.statusText,
          copyMsg: null,
        });
        return;
      }
      const text = typeof j.text === "string" ? j.text.trim() : "";
      if (!text) {
        setHomeRecap({
          runId,
          loading: false,
          text: null,
          error: "Empty response",
          copyMsg: null,
        });
        return;
      }
      setHomeRecap({
        runId,
        loading: false,
        text,
        error: null,
        copyMsg: null,
      });
    } catch (e) {
      setHomeRecap({
        runId,
        loading: false,
        text: null,
        error: e instanceof Error ? e.message : "Request failed",
        copyMsg: null,
      });
    }
  }

  async function copyHomeRecap() {
    if (!homeRecap?.text) return;
    try {
      await navigator.clipboard.writeText(homeRecap.text);
      setHomeRecap((prev) => (prev ? { ...prev, copyMsg: "Copied" } : prev));
      setTimeout(() => {
        setHomeRecap((prev) => (prev ? { ...prev, copyMsg: null } : prev));
      }, 2000);
    } catch {
      setHomeRecap((prev) => (prev ? { ...prev, copyMsg: "Could not copy" } : prev));
      setTimeout(() => {
        setHomeRecap((prev) => (prev ? { ...prev, copyMsg: null } : prev));
      }, 3000);
    }
  }

  return (
    <div className="product-hero-block">
      <h1 className="page-title">Research a topic</h1>
      <div style={{ maxWidth: "40rem" }}>
        <p className="page-lead muted" style={{ marginBottom: 0 }}>
          A topic is what you want to learn about—a question or subject in plain language.
        </p>
        <p className="muted" style={{ marginTop: "0.65rem", marginBottom: 0, lineHeight: 1.5 }}>
          We gather public signals from Hacker News, Polymarket, and Reddit. Each run opens its own page
          with a report and sources. History lists your threads; open one to revisit saved runs.
        </p>
        <p className="muted" style={{ marginTop: "0.65rem", marginBottom: 0, lineHeight: 1.5 }}>
          No sign-in. Data is kept for this browser session only.
        </p>
      </div>
      <form className="product-surface" onSubmit={submit} style={{ marginTop: "1.25rem" }}>
        <label className="field-label" htmlFor="topic">
          Topic
        </label>
        <textarea
          id="topic"
          className="topic-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Stable diffusion licensing news"
          autoComplete="off"
          disabled={loading}
          maxLength={500}
        />
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
          {topic.length}/500 characters
        </p>
        {!canSubmit && !loading ? (
          <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
            Type a topic to get started.
          </p>
        ) : null}
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
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {loading ? "Starting…" : "Run research"}
          </button>
          <Link href="/history" className="btn btn-ghost">
            History
          </Link>
        </div>
      </form>
      {error && <p className="error">{error}</p>}

      {recentThreads && recentThreads.length > 0 ? (
        <section className="home-recent-threads" aria-label="Recent threads">
          <h2 className="home-recent-threads__heading">Recent threads</h2>
          <ul className="home-recent-threads__list">
            {recentThreads.map((r) => {
              const label = r.displayTitle?.trim() || r.topic;
              return (
                <li key={r.id} className="home-recent-threads__item">
                  <div className="home-recent-threads__title">{label}</div>
                  <div className="muted" style={{ fontSize: "0.82rem", marginTop: "0.15rem" }}>
                    Updated {formatRecentThreadTime(r.updatedAt)}
                  </div>
                  <div className="home-recent-threads__links">
                    <Link href={`/research/${r.id}`} className="home-recent-threads__link">
                      Thread
                    </Link>
                    {r.latestRun ? (
                      <>
                        <span className="home-recent-threads__sep" aria-hidden>
                          {" · "}
                        </span>
                        <Link href={`/job/${r.latestRun.id}`} className="home-recent-threads__link">
                          Latest report
                        </Link>
                        {r.latestRun.status === "succeeded" ? (
                          <>
                            <span className="home-recent-threads__sep" aria-hidden>
                              {" · "}
                            </span>
                            <button
                              type="button"
                              className="home-recent-threads__link home-recent-threads__link-btn"
                              disabled={homeRecap?.loading}
                              onClick={() => void runHomeRecap(r.latestRun!.id)}
                            >
                              AI Summary
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  {r.latestRun && homeRecap && homeRecap.runId === r.latestRun.id ? (
                    <div className="home-recap-inline" role="region" aria-label="AI summary">
                      {homeRecap.loading ? <p className="muted">Generating summary…</p> : null}
                      {homeRecap.error ? (
                        <p className="gemini-error" role="alert" style={{ marginTop: 0 }}>
                          {homeRecap.error}
                        </p>
                      ) : null}
                      {homeRecap.text ? (
                        <>
                          <pre className="home-recap-inline__text">{homeRecap.text}</pre>
                          <div className="home-recap-inline__actions">
                            <button type="button" className="btn btn-secondary btn--sm" onClick={() => void copyHomeRecap()}>
                              {homeRecap.copyMsg === "Copied" ? "Copied" : "Copy"}
                            </button>
                            <button type="button" className="btn btn-ghost btn--sm" onClick={() => setHomeRecap(null)}>
                              Dismiss
                            </button>
                            {homeRecap.copyMsg && homeRecap.copyMsg !== "Copied" ? (
                              <span className="muted" style={{ fontSize: "0.8rem" }}>{homeRecap.copyMsg}</span>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="home-recent-threads__foot muted">
            <Link href="/history" className="home-recent-threads__link">
              View all in History
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
