import { z } from "zod";

/** Max length for AI polish lead (spec). */
export const POLISH_LEAD_MAX_CHARS = 240;

/** Model output before bullet-count alignment with deterministic outline. */
export const publishAnglePolishModelSchema = z.object({
  headline: z.string(),
  dek: z.string(),
  lead: z.string(),
  bullets: z.array(z.string()),
});

export type PublishAnglePolishModelParsed = z.infer<typeof publishAnglePolishModelSchema>;

export type PublishAnglePolishResponse = {
  headline: string;
  dek: string;
  lead: string;
  bullets: string[];
  citations: Array<{ title: string; url: string; source: string }>;
  polishNote?: "minimal_change";
};

export const publishAnglePolishRequestSchema = z.object({
  opportunityIndex: z.number().int().min(0),
});
