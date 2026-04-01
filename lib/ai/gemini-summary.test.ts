import { describe, expect, it, vi } from "vitest";
import { buildGeminiUserText, callGeminiGenerateSummary } from "./gemini-summary";

describe("buildGeminiUserText", () => {
  it("includes topic, report, items, language, and style", () => {
    const t = buildGeminiUserText(
      "Rust",
      "# Report\n\nHello",
      [
        {
          source: "hn",
          title: "Post",
          url: "https://x",
          snippet: "Snippet here",
          score: 1.5,
        },
      ],
      "vi",
      "bullets"
    );
    expect(t).toContain("Rust");
    expect(t).toContain("# Report");
    expect(t).toContain("hn");
    expect(t).toContain("https://x");
    expect(t).toContain("vi");
    expect(t).toContain("bullet");
  });
});

describe("callGeminiGenerateSummary", () => {
  it("returns GEMINI_NOT_CONFIGURED when no key", async () => {
    const r = await callGeminiGenerateSummary("hi", { apiKey: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("GEMINI_NOT_CONFIGURED");
  });

  it("returns text on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "  Summary line  " }] } }],
      }),
    });
    const r = await callGeminiGenerateSummary("prompt", {
      apiKey: "x",
      model: "gemini-2.0-flash",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toBe("Summary line");
  });

  it("returns GEMINI_HTTP on non-OK", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad",
    });
    const r = await callGeminiGenerateSummary("p", {
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("GEMINI_HTTP");
  });
});
