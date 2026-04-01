"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "vi", label: "Vietnamese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "ja", label: "Japanese" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
];

type StyleOpt = "short" | "bullets" | "executive";

export function GeminiSummaryPanel({
  jobId,
  enabled,
  geminiConfigured,
}: {
  jobId: string;
  /** Job succeeded and report exists */
  enabled: boolean;
  geminiConfigured: boolean;
}) {
  const [language, setLanguage] = useState("en");
  const [style, setStyle] = useState<StyleOpt>("short");
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/gemini-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language, style }),
      });
      const raw = await res.text();
      let j: { summary?: string; error?: string; code?: string } = {};
      try {
        j = JSON.parse(raw) as typeof j;
      } catch {
        setErr(raw || res.statusText);
        return;
      }
      if (!res.ok) {
        setErr(j.error ?? `Request failed (${res.status})`);
        return;
      }
      if (j.summary) setSummary(j.summary);
      else setErr("No summary in response");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) {
    return (
      <section className="gemini-panel gemini-panel--muted" aria-label="AI summary">
        <h2 className="section-title">Optional AI summary</h2>
        <p className="muted">
          Run a successful research job with a stored report to generate a transient Gemini summary here. Nothing is
          saved to the database.
        </p>
      </section>
    );
  }

  if (!geminiConfigured) {
    return (
      <section className="gemini-panel gemini-panel--muted" aria-label="AI summary">
        <h2 className="section-title">Optional AI summary</h2>
        <p className="muted">
          Gemini is not configured on this deployment (<code>GEMINI_API_KEY</code>). The research report above is
          unchanged.
        </p>
      </section>
    );
  }

  return (
    <section className="gemini-panel" aria-label="AI summary">
      <h2 className="section-title">Optional AI summary</h2>
      <p className="section-hint muted">
        One-shot summary from your topic, report, and top items only. Not saved; refresh clears it. Not a chat.
      </p>

      <div className="gemini-controls">
        <div className="gemini-field">
          <label className="field-label" htmlFor="gemini-lang">
            Language
          </label>
          <select
            id="gemini-lang"
            className="gemini-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={loading}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="gemini-field">
          <label className="field-label" htmlFor="gemini-style">
            Style
          </label>
          <select
            id="gemini-style"
            className="gemini-select"
            value={style}
            onChange={(e) => setStyle(e.target.value as StyleOpt)}
            disabled={loading}
          >
            <option value="short">Short paragraphs</option>
            <option value="bullets">Bullet list</option>
            <option value="executive">Executive brief</option>
          </select>
        </div>
        <div className="gemini-field gemini-field--action">
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => void generate()}>
            {loading ? "Generating…" : "Generate summary"}
          </button>
        </div>
      </div>

      {err && <p className="gemini-error">{err}</p>}

      {summary && (
        <div className="gemini-output report-md">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
