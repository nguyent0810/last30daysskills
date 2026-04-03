import { describe, expect, it, vi } from "vitest";
import { resolveGeminiProviderFromUserKey } from "./select";

describe("resolveGeminiProviderFromUserKey", () => {
  it("returns null for whitespace-only key", () => {
    expect(resolveGeminiProviderFromUserKey("   ")).toBeNull();
  });

  it("uses GEMINI_MODEL when set", () => {
    vi.stubEnv("GEMINI_MODEL", "custom-model");
    const p = resolveGeminiProviderFromUserKey("k");
    expect(p?.ok).toBe(true);
    if (p?.ok) expect(p.model).toBe("custom-model");
    vi.unstubAllEnvs();
  });
});
