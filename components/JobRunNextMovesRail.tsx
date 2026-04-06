"use client";

import Link from "next/link";
import type { PublishAnglesOpportunity } from "@/lib/publish-angles/types";

type Props = {
  threadId: string | null;
  running: boolean;
  canRerun: boolean;
  rerunLoading: boolean;
  onRunAgain: () => void;
  canOpenReport: boolean;
  onOpenFullReport: () => void;
  canCopyReport: boolean;
  onCopyReport: () => void;
  firstAngle: PublishAnglesOpportunity | null;
  onCopyFirstAngle: () => void;
  latestPolishMarkdown: string | null;
  onCopyPolish: () => void;
  onGoToAngles: () => void;
};

export function JobRunNextMovesRail({
  threadId,
  running,
  canRerun,
  rerunLoading,
  onRunAgain,
  canOpenReport,
  onOpenFullReport,
  canCopyReport,
  onCopyReport,
  firstAngle,
  onCopyFirstAngle,
  latestPolishMarkdown,
  onCopyPolish,
  onGoToAngles,
}: Props) {
  return (
    <div className="job-rail job-rail-next">
      <p className="job-rail__eyebrow">Next moves</p>
      <ul className="job-rail-next__list">
        {canOpenReport ? (
          <li>
            <button type="button" className="job-rail-next__btn" onClick={onOpenFullReport}>
              Open full report tab
            </button>
          </li>
        ) : null}
        {canCopyReport ? (
          <li>
            <button type="button" className="job-rail-next__btn" onClick={onCopyReport}>
              Copy report (markdown)
            </button>
          </li>
        ) : null}
        {firstAngle ? (
          <li>
            <button type="button" className="job-rail-next__btn" onClick={onCopyFirstAngle}>
              Copy first publish angle
            </button>
            <span className="job-rail-next__hint muted" title={firstAngle.workingTitle}>
              {firstAngle.workingTitle.length > 48 ? `${firstAngle.workingTitle.slice(0, 45)}…` : firstAngle.workingTitle}
            </span>
          </li>
        ) : null}
        {latestPolishMarkdown ? (
          <li>
            <button type="button" className="job-rail-next__btn" onClick={onCopyPolish}>
              Copy latest AI polish
            </button>
          </li>
        ) : null}
        <li>
          <button type="button" className="job-rail-next__btn" onClick={onGoToAngles}>
            Jump to publish angles
          </button>
        </li>
        {threadId ? (
          <li>
            <Link href={`/research/${threadId}`} className="job-rail-next__link">
              Open thread
            </Link>
          </li>
        ) : null}
        <li>
          <Link href="/history" className="job-rail-next__link">
            History
          </Link>
        </li>
        <li>
          <Link href="/" className="job-rail-next__link">
            New run (sharper topic)
          </Link>
          <span className="job-rail-next__hint muted">Home — refine wording, then run</span>
        </li>
        <li>
          <button type="button" className="job-rail-next__btn" disabled={!canRerun || rerunLoading} onClick={onRunAgain}>
            {rerunLoading ? "Starting…" : running ? "Run in progress" : "Run again"}
          </button>
        </li>
      </ul>
    </div>
  );
}
