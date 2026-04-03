"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HOME_RECENT_JOBS_LIMIT, homeRecentJobsListUrl } from "@/lib/history/history-list-view";
import { mapRecapErrorToUi } from "@/lib/ai/run-recap/ui-copy";

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
  details: string | null;
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
    setHomeRecap({
      runId,
      loading: true,
      text: null,
      error: null,
      details: null,
      copyMsg: null,
    });
    try {
      const res = await fetch(`/api/jobs/${runId}/ai-recap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const raw = await res.text();
      let j: { text?: string; error?: string; code?: string } = {};
      try {
        j = JSON.parse(raw) as typeof j;
      } catch {
        // keep j as {}
      }
      if (!res.ok) {
        const mapped = mapRecapErrorToUi({
          code: j.code,
          error: j.error ?? raw ?? res.statusText,
        });
        setHomeRecap({
          runId,
          loading: false,
          text: null,
          error: mapped.message,
          details: mapped.details,
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
          details: null,
          copyMsg: null,
        });
        return;
      }
      setHomeRecap({
        runId,
        loading: false,
        text,
        error: null,
        details: null,
        copyMsg: null,
      });
    } catch (e) {
      setHomeRecap({
        runId,
        loading: false,
        text: null,
        error: e instanceof Error ? e.message : "Request failed",
        details: null,
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
    <div className="home-layout">
      <section className="home-hero-strip">
        <p className="product-eyebrow">Research · Public signal workspace</p>
        <h1 className="page-title">Research any topic</h1>
        <div className="home-hero-strip__copy">
          <p className="page-lead" style={{ marginBottom: 0 }}>
            Turn one question into a concise research output with report, recap, and source evidence.
          </p>
          <p className="muted" style={{ marginTop: "0.5rem", marginBottom: 0, lineHeight: 1.5 }}>
            No sign-in required. Your data stays scoped to this browser session.
          </p>
        </div>
      </section>

      <section className="home-workspace" aria-label="Home workspace">
        <div className="home-workspace__primary">
          <h2 className="section-title home-workspace__heading">Start new research</h2>
          <p className="section-hint muted home-workspace__hint">
            Enter a topic, pick a suggestion, and start a new run.
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
        </div>

        <aside className="home-workspace__continuity" aria-label="Continue your work">
          <section className="home-recent-threads">
            <h2 className="home-recent-threads__heading">Continue your work</h2>
            <p className="home-recent-threads__subhead muted">
              Re-open active threads, jump to the latest report, or run a quick AI summary.
            </p>
            {recentThreads && recentThreads.length > 0 ? (
              <>
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
                                    className="btn btn-secondary btn--sm home-recent-threads__ai-btn"
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
                              <>
                                <p className="gemini-error" role="alert" style={{ marginTop: 0 }}>
                                  {homeRecap.error}
                                </p>
                                {homeRecap.details ? (
                                  <details className="run-recap-details">
                                    <summary>Show details</summary>
                                    <pre>{homeRecap.details}</pre>
                                  </details>
                                ) : null}
                              </>
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
              </>
            ) : (
              <p className="muted home-recent-threads__empty">
                No recent threads yet. Your latest runs will appear here.
              </p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
