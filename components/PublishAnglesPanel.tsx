"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { mapPolishErrorToUi } from "@/lib/publish-angles/polish-ui-copy";
import type { PublishAnglePolishResponse } from "@/lib/publish-angles/polish-schema";
import type { PublishAnglesPhase1 } from "@/lib/publish-angles/types";
import { formatPolishForCopy } from "@/lib/job-page/format-angle-copy";
import { SHELL_EASE } from "@/lib/motion/shell";

function sourceShort(s: string): string {
  if (s === "hn") return "HN";
  if (s === "polymarket") return "PM";
  if (s === "reddit") return "Reddit";
  return s;
}

type Props = {
  jobId: string;
  jobStatus: string;
  publishAngles: PublishAnglesPhase1;
  aiRecapConfigured: boolean;
  /** Fired after a successful polish — markdown for clipboard (side rail, etc.). */
  onPolishReady?: (opportunityIndex: number, markdown: string) => void;
};

export function PublishAnglesPanel({ jobId, jobStatus, publishAngles, aiRecapConfigured, onPolishReady }: Props) {
  const { momentumLine, opportunities } = publishAngles;
  const running = jobStatus === "queued" || jobStatus === "running";
  const failed = jobStatus === "failed";
  const succeeded = jobStatus === "succeeded";

  const [polishByIndex, setPolishByIndex] = useState<Record<number, PublishAnglePolishResponse>>({});
  const [polishLoading, setPolishLoading] = useState<number | null>(null);
  const [polishError, setPolishError] = useState<Record<number, string>>({});
  const [polishDetails, setPolishDetails] = useState<Record<number, string | null>>({});

  async function runPolish(index: number) {
    setPolishLoading(index);
    setPolishError((e) => ({ ...e, [index]: "" }));
    setPolishDetails((d) => ({ ...d, [index]: null }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/publish-angles/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ opportunityIndex: index }),
      });
      const raw = await res.text();
      let j: PublishAnglePolishResponse & { error?: string; code?: string } = {} as PublishAnglePolishResponse & {
        error?: string;
        code?: string;
      };
      try {
        j = JSON.parse(raw) as typeof j;
      } catch {
        // keep j empty
      }
      if (!res.ok) {
        const mapped = mapPolishErrorToUi({
          code: j.code,
          error: j.error ?? raw ?? res.statusText,
        });
        setPolishError((e) => ({ ...e, [index]: mapped.message }));
        setPolishDetails((d) => ({ ...d, [index]: mapped.details }));
        return;
      }
      if (typeof j.headline !== "string" || !Array.isArray(j.bullets)) {
        setPolishError((e) => ({ ...e, [index]: "Invalid polish response" }));
        return;
      }
      setPolishError((e) => ({ ...e, [index]: "" }));
      setPolishDetails((d) => ({ ...d, [index]: null }));
      const parsed = j as PublishAnglePolishResponse;
      setPolishByIndex((prev) => ({ ...prev, [index]: parsed }));
      onPolishReady?.(index, formatPolishForCopy(parsed));
    } catch (e) {
      setPolishError((err) => ({
        ...err,
        [index]: e instanceof Error ? e.message : "Request failed",
      }));
    } finally {
      setPolishLoading(null);
    }
  }

  if (running) {
    return (
      <section id="publish-angles" className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">Publishing angles appear when this run finishes.</p>
      </section>
    );
  }

  if (failed && opportunities.length === 0) {
    return (
      <section id="publish-angles" className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">No source-backed angles for this run.</p>
      </section>
    );
  }

  if (succeeded && opportunities.length === 0) {
    return (
      <section id="publish-angles" className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">No angles surfaced for this run (thin report or sources).</p>
      </section>
    );
  }

  if (opportunities.length === 0) {
    return (
      <section id="publish-angles" className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">No source-backed angles for this run.</p>
      </section>
    );
  }

  const canPolish = succeeded && aiRecapConfigured;

  return (
    <section id="publish-angles" className="publish-angles" aria-label="Publishing angles">
      <h3 className="publish-angles__title">Publishing angles</h3>
      <p className="section-hint muted publish-angles__sub">
        Supplementary ideas from this run’s sources — the full report and key findings above stay primary.
      </p>
      {failed ? (
        <p className="muted publish-angles__warn">Run did not complete — angles are from retrieved sources only.</p>
      ) : null}
      {momentumLine ? <p className="muted publish-angles__momentum">{momentumLine}</p> : null}
      <ul className="publish-angles__list">
        {opportunities.map((op, i) => {
          const polished = polishByIndex[i];
          const loading = polishLoading === i;
          const err = polishError[i];
          const details = polishDetails[i];
          return (
            <li key={`${op.citations[0]?.url ?? "op"}-${i}`} className="publish-angles__card">
              <p className="publish-angles__eyebrow muted">
                {publishAngles.derivation === "report-led" ? "From report + sources" : "From top sources"}
                {op.confidence === "high"
                  ? " · Strong match"
                  : op.confidence === "medium"
                    ? " · Moderate match"
                    : " · Weaker match"}
              </p>
              <h4 className="publish-angles__card-title">{op.workingTitle}</h4>
              <p className="publish-angles__dek">{op.dek}</p>
              <p className="muted publish-angles__why">{op.whyItMatters}</p>
              <ul className="publish-angles__outline">
                {op.outline.map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
              <div className="publish-angles__cites">
                <span className="muted publish-angles__cites-label">Sources</span>
                <ul className="publish-angles__cite-list">
                  {op.citations.map((c, k) => (
                    <li key={`${c.url}-${k}`}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="publish-angles__cite-link">
                        {c.title}
                      </a>
                      <span className="muted publish-angles__cite-meta"> · {sourceShort(c.source)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {canPolish ? (
                <div className="publish-angles__polish-actions">
                  <motion.button
                    type="button"
                    className="btn btn-ghost btn--sm"
                    disabled={loading}
                    onClick={() => void runPolish(i)}
                    whileTap={!loading ? { scale: 0.98 } : undefined}
                    transition={{ duration: 0.12, ease: SHELL_EASE }}
                  >
                    {loading ? "Polishing…" : "Polish with AI"}
                  </motion.button>
                </div>
              ) : null}
              {!canPolish && succeeded && !aiRecapConfigured ? (
                <p className="muted publish-angles__polish-hint">AI polish requires server AI to be configured.</p>
              ) : null}

              {err ? (
                <p className="publish-angles__polish-error" role="alert">
                  {err}
                  {details ? (
                    <span className="publish-angles__polish-error-details">
                      {" "}
                      ({details})
                    </span>
                  ) : null}
                </p>
              ) : null}

              {polished ? (
                <div className="publish-angles__polish-augment" aria-label="AI polish draft">
                  <p className="publish-angles__polish-label muted">AI polish (draft)</p>
                  <p className="muted publish-angles__polish-disclaimer">
                    For readability only — verify against the original angle and sources.
                  </p>
                  {polished.polishNote === "minimal_change" ? (
                    <p className="muted publish-angles__polish-note">Little change suggested — your angle was already tight.</p>
                  ) : null}
                  <h5 className="publish-angles__polish-headline">{polished.headline}</h5>
                  <p className="publish-angles__polish-dek">{polished.dek}</p>
                  <p className="publish-angles__polish-lead">{polished.lead}</p>
                  <ul className="publish-angles__polish-bullets">
                    {polished.bullets.map((b, bi) => (
                      <li key={bi}>{b}</li>
                    ))}
                  </ul>
                  <span className="muted publish-angles__cites-label">Sources (same as above)</span>
                  <ul className="publish-angles__cite-list">
                    {(polished.citations ?? []).map((c, ck) => (
                      <li key={`${c.url}-p-${ck}`}>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="publish-angles__cite-link">
                          {c.title}
                        </a>
                        <span className="muted publish-angles__cite-meta"> · {sourceShort(c.source)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
