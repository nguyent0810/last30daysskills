/**
 * Phase 6 — thread AI compression (internal service contract).
 */

export type CompressionResult =
  | { ok: true; text: string }
  | { ok: false; code: string; message: string };
