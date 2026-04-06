import { describe, expect, it } from "vitest";
import { publishAnglePolishModelSchema, publishAnglePolishRequestSchema } from "./polish-schema";

describe("publishAnglePolishRequestSchema", () => {
  it("accepts valid index", () => {
    expect(publishAnglePolishRequestSchema.safeParse({ opportunityIndex: 0 }).success).toBe(true);
  });

  it("rejects negative index", () => {
    expect(publishAnglePolishRequestSchema.safeParse({ opportunityIndex: -1 }).success).toBe(false);
  });
});

describe("publishAnglePolishModelSchema", () => {
  it("accepts valid shape", () => {
    const r = publishAnglePolishModelSchema.safeParse({
      headline: "H",
      dek: "Dek line here ok",
      lead: "Short lead text ok.",
      bullets: ["a", "b"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing keys", () => {
    expect(
      publishAnglePolishModelSchema.safeParse({
        headline: "H",
        dek: "D",
      }).success
    ).toBe(false);
  });
});
