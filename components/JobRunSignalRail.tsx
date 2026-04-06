"use client";

import { useMemo } from "react";
import type { JobSignalRailDerived } from "@/lib/job-page/side-rails-signal";
import { deriveJobSignalRail, topicAccentHue } from "@/lib/job-page/side-rails-signal";

type SourceRunLike = {
  source: string;
  status: string;
  itemCount: number;
};

type Props = {
  topic: string;
  jobStatus: string;
  orderedRuns: readonly SourceRunLike[];
};

function shortSource(s: string): string {
  if (s === "hn") return "HN";
  if (s === "reddit") return "RD";
  if (s === "polymarket") return "PM";
  return s.slice(0, 2).toUpperCase();
}

export function JobRunSignalRail({ topic, jobStatus, orderedRuns }: Props) {
  const derived: JobSignalRailDerived = useMemo(
    () => deriveJobSignalRail(orderedRuns, jobStatus),
    [orderedRuns, jobStatus]
  );

  const hue = useMemo(() => topicAccentHue(topic), [topic]);

  const bar =
    derived.itemTotal > 0 ? (
      <div className="job-rail-signal__bar" role="presentation" aria-hidden>
        {derived.shareHn > 0 ? (
          <span
            className="job-rail-signal__bar-seg job-rail-signal__bar-seg--hn"
            style={{ flexGrow: Math.max(derived.shareHn, 0.02) }}
          />
        ) : null}
        {derived.shareReddit > 0 ? (
          <span
            className="job-rail-signal__bar-seg job-rail-signal__bar-seg--reddit"
            style={{ flexGrow: Math.max(derived.shareReddit, 0.02) }}
          />
        ) : null}
        {derived.sharePolymarket > 0 ? (
          <span
            className="job-rail-signal__bar-seg job-rail-signal__bar-seg--pm"
            style={{ flexGrow: Math.max(derived.sharePolymarket, 0.02) }}
          />
        ) : null}
      </div>
    ) : null;

  return (
    <div className="job-rail job-rail-signal">
      <p className="job-rail__eyebrow">Signal context</p>
      <div className="job-rail-signal__topic">
        <span className="job-rail-signal__topic-dot" style={{ background: `hsl(${hue} 48% 46%)` }} aria-hidden />
        <span className="job-rail-signal__topic-line muted" title={topic}>
          {topic.length > 56 ? `${topic.slice(0, 53)}…` : topic}
        </span>
      </div>
      <p className="job-rail-signal__shape">{derived.shapeLabel}</p>
      <p className="job-rail-signal__coverage muted">{derived.coverageNote}</p>
      {bar}
      {orderedRuns.length > 0 ? (
        <ul className="job-rail-signal__chips" aria-label="Sources in this run">
          {orderedRuns.map((r) => {
            const failed = r.status === "failed";
            const empty = r.status === "succeeded" && r.itemCount === 0;
            const cls = failed
              ? "job-rail-signal__chip job-rail-signal__chip--fail"
              : empty
                ? "job-rail-signal__chip job-rail-signal__chip--empty"
                : "job-rail-signal__chip job-rail-signal__chip--ok";
            return (
              <li key={r.source} className={cls}>
                {shortSource(r.source)}
                <span className="job-rail-signal__chip-n">{failed ? "—" : r.itemCount}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
