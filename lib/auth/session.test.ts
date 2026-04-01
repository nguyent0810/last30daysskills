import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { signUserSessionToken, verifyUserSessionToken } from "./session";

describe("session token", () => {
  const prev = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "x".repeat(32);
  });

  afterEach(() => {
    process.env.SESSION_SECRET = prev;
  });

  it("round-trips a user id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const t = signUserSessionToken(id);
    expect(verifyUserSessionToken(t)).toBe(id.toLowerCase());
  });

  it("rejects tampered token", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const t = signUserSessionToken(id);
    const bad = t.slice(0, -1) + (t.at(-1) === "0" ? "1" : "0");
    expect(verifyUserSessionToken(bad)).toBeNull();
  });
});
