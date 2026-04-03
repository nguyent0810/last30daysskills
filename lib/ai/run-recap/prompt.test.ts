import { describe, expect, it } from "vitest";
import { buildRunRecapPrompts } from "./prompt";

describe("buildRunRecapPrompts", () => {
  it("uses requested language and grounded sectioned format", () => {
    const contextBlock = "Topic: dummy context\nRun status: succeeded\nReport mode: deterministic\n";
    const { system, user } = buildRunRecapPrompts(
      "Thị trường crypto",
      null,
      contextBlock,
      "vi"
    );

    expect(system).toContain("grounded recap");
    expect(system).toContain("Output must be grounded in the run evidence");
    expect(system).toContain("If relevance to the query looks weak/noisy/indirect");
    expect(user.split("\n")[0]).toBe("Write your entire response in Vietnamese.");
    expect(user).toContain("--- Run context ---");
    expect(user).toContain("--- End context ---");
    expect(user).toContain("Định dạng đầu ra (dùng đúng tiêu đề):");
    expect(user).toContain("Grounding requirements:");
  });

  it("defaults to English when language is omitted", () => {
    const { user, language } = buildRunRecapPrompts("topic", null, "ctx");
    expect(language).toBe("en");
    expect(user.split("\n")[0]).toBe("Write your entire response in English.");
  });
});

