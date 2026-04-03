"use client";

import { useState } from "react";

export function RunRecapPanel({
  jobId,
  enabled,
}: {
  jobId: string;
  enabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setCopyMsg(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/ai-recap`, {
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
        setError(j.error ?? raw ?? res.statusText);
        return;
      }
      const t = typeof j.text === "string" ? j.text.trim() : "";
      if (!t) {
        setError("Empty response");
        return;
      }
      setText(t); // replace on rerun (no stacking)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    setText(null);
    setError(null);
    setCopyMsg(null);
  }

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Copied");
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg("Could not copy");
      setTimeout(() => setCopyMsg(null), 3000);
    }
  }

  if (!enabled) return null;

  return (
    <section className="gemini-panel" aria-label="AI recap (run)">
      <h2 className="section-title">Optional AI recap (this run)</h2>
      <p className="section-hint muted">Optional short recap from this run’s report. Not saved.</p>

      <div className="gemini-controls" style={{ marginTop: "0.75rem" }}>
        <div className="gemini-field gemini-field--action">
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void generate()}>
            {loading ? "Generating…" : "Generate recap"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="gemini-error" role="alert">
          {error}
        </p>
      ) : null}

      {text ? (
        <>
          <div className="gemini-output report-md" style={{ marginTop: "1rem" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</pre>
          </div>

          <div className="gemini-controls" style={{ marginTop: "0.75rem" }}>
            <div className="gemini-field gemini-field--action">
              <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
                {copyMsg === "Copied" ? "Copied" : "Copy recap"}
              </button>
            </div>
            <div className="gemini-field gemini-field--action" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="btn btn-ghost" onClick={dismiss}>
                Dismiss
              </button>
            </div>
          </div>

          {copyMsg && copyMsg !== "Copied" ? (
            <p className="gemini-error" role="alert" style={{ marginTop: "0.55rem" }}>
              {copyMsg}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

