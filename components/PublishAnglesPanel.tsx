"use client";

import type { PublishAnglesPhase1 } from "@/lib/publish-angles/types";

function sourceShort(s: string): string {
  if (s === "hn") return "HN";
  if (s === "polymarket") return "PM";
  if (s === "reddit") return "Reddit";
  return s;
}

type Props = {
  jobStatus: string;
  publishAngles: PublishAnglesPhase1;
};

export function PublishAnglesPanel({ jobStatus, publishAngles }: Props) {
  const { momentumLine, opportunities } = publishAngles;
  const running = jobStatus === "queued" || jobStatus === "running";
  const failed = jobStatus === "failed";
  const succeeded = jobStatus === "succeeded";

  if (running) {
    return (
      <section className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">Publishing angles appear when this run finishes.</p>
      </section>
    );
  }

  if (failed && opportunities.length === 0) {
    return (
      <section className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">No source-backed angles for this run.</p>
      </section>
    );
  }

  if (succeeded && opportunities.length === 0) {
    return (
      <section className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">No angles surfaced for this run (thin report or sources).</p>
      </section>
    );
  }

  if (opportunities.length === 0) {
    return (
      <section className="publish-angles" aria-label="Publishing angles">
        <p className="muted publish-angles__hold">No source-backed angles for this run.</p>
      </section>
    );
  }

  return (
    <section className="publish-angles" aria-label="Publishing angles">
      <h3 className="publish-angles__title">Publishing angles</h3>
      <p className="section-hint muted publish-angles__sub">
        Supplementary ideas from this run’s sources — the full report and key findings above stay primary.
      </p>
      {failed ? (
        <p className="muted publish-angles__warn">Run did not complete — angles are from retrieved sources only.</p>
      ) : null}
      {momentumLine ? <p className="muted publish-angles__momentum">{momentumLine}</p> : null}
      <ul className="publish-angles__list">
        {opportunities.map((op, i) => (
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
          </li>
        ))}
      </ul>
    </section>
  );
}
