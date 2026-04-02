"use client";

import { useState } from "react";
import {
  DIGEST_INITIAL_PER_SECTION,
  DIGEST_MAX_PER_SECTION,
  type DigestItem,
  groupItemsForDigest,
} from "@/lib/job-page/editorial-digest";

function sourceShort(s: string): string {
  if (s === "hn") return "HN";
  if (s === "polymarket") return "PM";
  if (s === "reddit") return "Reddit";
  return s;
}

export function EditorialDigest({ items }: { items: DigestItem[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = groupItemsForDigest(items);

  if (groups.length === 0) return null;

  return (
    <section className="digest" aria-label="At a glance">
      <h2 className="section-title">At a glance</h2>
      <p className="section-hint muted">
        Two columns — how-to and tooling vs. discussion. Open the full report when you want the long version.
      </p>
      <div className="digest__grid">
        {groups.map((g) => {
          const isOpen = Boolean(expanded[g.bucket]);
          const cap = isOpen ? DIGEST_MAX_PER_SECTION : DIGEST_INITIAL_PER_SECTION;
          const visible = g.items.slice(0, cap);
          const canToggle = g.items.length > DIGEST_INITIAL_PER_SECTION;

          return (
            <div key={g.bucket} className="digest__bucket">
              <h3 className="digest__bucket-title">{g.label}</h3>
              <ul className="digest__list">
                {visible.map((it) => (
                  <li key={it.id} className="digest__item">
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="digest__link">
                      {it.title}
                    </a>
                    <div className="digest__meta">
                      {sourceShort(it.source)} · score {it.score.toFixed(2)}
                    </div>
                    {it.snippet ? (
                      <p className="digest__snippet">
                        {it.snippet.length > 120 ? `${it.snippet.slice(0, 120)}…` : it.snippet}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {canToggle && (
                <button
                  type="button"
                  className="btn btn-ghost digest__toggle"
                  onClick={() => setExpanded((e) => ({ ...e, [g.bucket]: !isOpen }))}
                >
                  {isOpen ? "Show less" : "Show more in this section"}
                </button>
              )}
              {isOpen && g.items.length > DIGEST_MAX_PER_SECTION ? (
                <p className="digest__cap muted">Capped at {DIGEST_MAX_PER_SECTION} items in this section.</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
