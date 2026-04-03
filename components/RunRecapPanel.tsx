"use client";

import { useEffect, useState } from "react";

const GEMINI_BYOK_STORAGE_KEY = "crm_ai_recap_gemini_api_key";

export function RunRecapPanel({
  jobId,
  enabled,
  serverAiRecapConfigured,
  serverKind,
}: {
  jobId: string;
  enabled: boolean;
  serverAiRecapConfigured: boolean;
  serverKind?: "hf" | "gemini";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const [draftKey, setDraftKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(GEMINI_BYOK_STORAGE_KEY);
      setSavedKey(v && v.trim() ? v : null);
    } catch {
      setSavedKey(null);
    }
  }, []);

  const canGenerateRecap = serverAiRecapConfigured || Boolean(savedKey?.trim());

  const recapSourceLabel = (() => {
    if (savedKey?.trim()) return "Your Gemini key";
    if (serverAiRecapConfigured) {
      return serverKind === "gemini" ? "Server default (Gemini)" : "Server default (Hugging Face)";
    }
    return "Not configured (needs server AI or a saved Gemini key)";
  })();

  async function generate() {
    setLoading(true);
    setError(null);
    setCopyMsg(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const k = savedKey?.trim();
      if (k) headers["X-Gemini-API-Key"] = k;

      const res = await fetch(`/api/jobs/${jobId}/ai-recap`, {
        method: "POST",
        headers,
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

  function saveGeminiLocally() {
    const t = draftKey.trim();
    try {
      if (t) {
        localStorage.setItem(GEMINI_BYOK_STORAGE_KEY, t);
        setSavedKey(t);
      } else {
        localStorage.removeItem(GEMINI_BYOK_STORAGE_KEY);
        setSavedKey(null);
      }
    } catch {
      /* ignore quota / private mode */
    }
    setDraftKey("");
  }

  function clearGeminiLocally() {
    try {
      localStorage.removeItem(GEMINI_BYOK_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSavedKey(null);
    setDraftKey("");
  }

  if (!enabled) return null;

  return (
    <section className="gemini-panel" aria-label="AI recap (run)">
      <h2 className="section-title">Optional AI recap (this run)</h2>
      <p className="section-hint muted">Optional short recap from this run’s report. Not saved.</p>

      <div className="run-recap-byok" style={{ marginTop: "0.65rem" }}>
        <label className="muted" style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.35rem" }}>
          Optional Gemini API key
        </label>
        <input
          type="password"
          className="topic-input"
          style={{ maxWidth: "min(28rem, 100%)", fontSize: "0.9rem" }}
          autoComplete="off"
          spellCheck={false}
          placeholder={savedKey ? "•••••••• (saved)" : "Paste key to use Gemini for this device only"}
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.45rem", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary btn--sm" onClick={saveGeminiLocally}>
            Save locally
          </button>
          <button type="button" className="btn btn-ghost btn--sm" onClick={clearGeminiLocally}>
            Clear
          </button>
        </div>
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.45rem", marginBottom: 0 }}>
          Recap will use: <strong>{recapSourceLabel}</strong>
        </p>
      </div>

      <div className="gemini-controls" style={{ marginTop: "0.75rem" }}>
        <div className="gemini-field gemini-field--action">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading || !canGenerateRecap}
            title={!canGenerateRecap ? "Configure server AI or save a Gemini key above" : undefined}
            onClick={() => void generate()}
          >
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
