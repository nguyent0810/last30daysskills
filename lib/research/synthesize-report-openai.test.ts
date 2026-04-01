import { describe, expect, it, vi } from "vitest";
import { synthesizeReportWithOpenAI } from "./synthesize-report-openai";

const TOPIC = "rust async";
const DETERMINISTIC = "# Research: rust\n\n_line one._\n";

describe("synthesizeReportWithOpenAI", () => {
  it("returns deterministic markdown unchanged when apiKey is missing", async () => {
    const fetchSpy = vi.fn();
    const out = await synthesizeReportWithOpenAI(TOPIC, DETERMINISTIC, {
      apiKey: "",
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });
    expect(out).toBe(DETERMINISTIC);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns deterministic markdown when API returns non-OK", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    });
    const out = await synthesizeReportWithOpenAI(TOPIC, DETERMINISTIC, {
      apiKey: "sk-test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBe(DETERMINISTIC);
  });

  it("returns deterministic markdown when response JSON has no message content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{}] }),
    });
    const out = await synthesizeReportWithOpenAI(TOPIC, DETERMINISTIC, {
      apiKey: "sk-test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBe(DETERMINISTIC);
  });

  it("returns model markdown on success", async () => {
    const polished = "# Polished\n\nHello.";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: polished } }],
      }),
    });
    const out = await synthesizeReportWithOpenAI(TOPIC, DETERMINISTIC, {
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBe(polished);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[1].content).toContain(DETERMINISTIC);
  });

  it("returns deterministic markdown when fetch throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const out = await synthesizeReportWithOpenAI(TOPIC, DETERMINISTIC, {
      apiKey: "sk-test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out).toBe(DETERMINISTIC);
  });
});
