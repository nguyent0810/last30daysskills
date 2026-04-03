import { describe, expect, it } from "vitest";
import { buildRunRecapPrompts } from "./prompt";

describe("buildRunRecapPrompts", () => {
  it("uses Vietnamese instruction when topic has Vietnamese marks", () => {
    const contextBlock = "Topic: dummy context\nRun status: succeeded\nReport mode: deterministic\n";
    const { system, user } = buildRunRecapPrompts(
      "Thị trường crypto",
      null,
      contextBlock
    );

    expect(system).toContain("Compression-only");
    expect(system).toContain("Output exactly 2–4 sentences");
    expect(user.split("\n")[0]).toBe("Write your entire response in Vietnamese.");
    expect(user).toContain("--- Run context ---");
    expect(user).toContain("--- End context ---");
    expect(user).toContain("Produce the compressed recap now");
  });
});

