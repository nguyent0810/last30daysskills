"use client";

import { useEffect, useState } from "react";
import {
  clearLocalGeminiApiKey,
  readLocalGeminiApiKey,
  writeLocalGeminiApiKey,
} from "@/lib/ai/run-recap/byok-local";
import { mapRecapErrorToUi, recapProviderStateLabel } from "@/lib/ai/run-recap/ui-copy";

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
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const [draftKey, setDraftKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    setSavedKey(readLocalGeminiApiKey());
  }, []);

  const canGenerateRecap = serverAiRecapConfigured || Boolean(savedKey?.trim());
  const usingGeminiKey = Boolean(savedKey?.trim());

  const recapSourceLabel = recapProviderStateLabel(usingGeminiKey, serverAiRecapConfigured);

  async function generate() {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
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
        const mapped = mapRecapErrorToUi({
          code: j.code,
          error: j.error ?? raw ?? res.statusText,
          usingGeminiKey,
        });
        setError(mapped.message);
        setErrorDetails(mapped.details);
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
    setErrorDetails(null);
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
    setSavedKey(writeLocalGeminiApiKey(draftKey));
    setDraftKey("");
  }

  function clearGeminiLocally() {
    clearLocalGeminiApiKey();
    setSavedKey(null);
    setDraftKey("");
  }

  if (!enabled) return null;

  return (
    <section className="gemini-panel" aria-label="AI recap (run)">
      <h2 className="section-title">AI recap</h2>
      <p className="section-hint muted">Quick summary from this run report. Ephemeral and not saved.</p>
      <p className="muted" style={{ fontSize: "0.84rem", marginTop: "0.35rem", marginBottom: 0 }}>
        <strong>{recapSourceLabel}</strong>
      </p>

      <div className="run-recap-quickaction">
        <button
          type="button"
          className="btn btn-primary run-recap-cta"
          disabled={loading || !canGenerateRecap}
          title={!canGenerateRecap ? "AI recap is currently unavailable" : undefined}
          onClick={() => void generate()}
        >
          {loading ? "Generating…" : "Generate recap"}
        </button>
      </div>

      <details className="run-recap-advanced">
        <summary>Use your Gemini API key (optional)</summary>
        <div style={{ marginTop: "0.55rem" }}>
          <input
            type="password"
            className="topic-input"
            style={{ maxWidth: "min(28rem, 100%)", fontSize: "0.9rem" }}
            autoComplete="off"
            spellCheck={false}
            placeholder={savedKey ? "•••••••• (saved)" : "Paste key for this browser only"}
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
        </div>
      </details>

      {error ? (
        <>
          <p className="gemini-error" role="alert">
            {error}
          </p>
          {errorDetails ? (
            <details className="run-recap-details">
              <summary>Show details</summary>
              <pre>{errorDetails}</pre>
            </details>
          ) : null}
        </>
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
