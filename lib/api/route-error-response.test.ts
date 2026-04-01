import { describe, expect, it, vi } from "vitest";
import { jsonFromRouteError } from "./route-error-response";

describe("jsonFromRouteError", () => {
  it("maps missing DATABASE_URL", async () => {
    const res = jsonFromRouteError(new Error("DATABASE_URL is not set"), "test");
    expect(res.status).toBe(503);
    const j = await res.json();
    expect(j.code).toBe("MISSING_DATABASE_URL");
  });

  it("maps SESSION_SECRET message", async () => {
    const res = jsonFromRouteError(
      new Error("SESSION_SECRET must be set (min 16 chars)"),
      "test"
    );
    expect(res.status).toBe(503);
    const j = await res.json();
    expect(j.code).toBe("MISSING_SESSION_SECRET");
  });

  it("maps connection errors to DATABASE_UNAVAILABLE", async () => {
    const res = jsonFromRouteError(new Error("connect ECONNREFUSED"), "test");
    expect(res.status).toBe(503);
    const j = await res.json();
    expect(j.code).toBe("DATABASE_UNAVAILABLE");
  });

  it("returns 500 for unknown errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = jsonFromRouteError(new Error("weird"), "test");
    spy.mockRestore();
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j.error).toBe("internal");
  });
});
