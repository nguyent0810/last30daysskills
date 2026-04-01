"use client";

import { useEffect } from "react";

/** Ensures `crm_session` cookie exists via GET /api/session (same-origin, credentials included). */
export function SessionBootstrap() {
  useEffect(() => {
    void fetch("/api/session", { credentials: "include" }).catch(() => {
      /* non-fatal: POST /api/jobs also establishes a session */
    });
  }, []);
  return null;
}
