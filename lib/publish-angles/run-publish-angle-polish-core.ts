import { runThreadCompression } from "@/lib/ai/thread-compression/run";
import type { ResolvedThreadCompressionProvider } from "@/lib/ai/thread-compression/select";
import { buildPublishAnglesPhase1 } from "@/lib/publish-angles/build-phase1";
import { buildPublishAnglePolishContext } from "@/lib/publish-angles/polish-context";
import { buildPublishAnglePolishPrompts } from "@/lib/publish-angles/polish-prompt";
import { extractJsonObject } from "@/lib/publish-angles/polish-parse-json";
import {
  publishAnglePolishModelSchema,
  type PublishAnglePolishResponse,
} from "@/lib/publish-angles/polish-schema";
import {
  isPolishOutputAcceptable,
  polishMinimalChangeNote,
  sanitizePolishModelFields,
} from "@/lib/publish-angles/polish-quality";
import type { PublishAnglesItemInput, PublishAnglesSourceRunInput } from "@/lib/publish-angles/types";

export type RunPublishAnglePolishCoreInput = {
  provider: Extract<ResolvedThreadCompressionProvider, { ok: true }>;
  jobTopic: string;
  displayTitle: string | null;
  reportMarkdown: string | null;
  items: PublishAnglesItemInput[];
  sourceRuns: PublishAnglesSourceRunInput[];
  opportunityIndex: number;
};

export type RunPublishAnglePolishCoreResult =
  | { ok: true; payload: PublishAnglePolishResponse }
  | { ok: false; code: string; message: string };

/**
 * Shared polish pipeline (DB fetch + auth live in the API route).
 */
export async function runPublishAnglePolishCore(
  input: RunPublishAnglePolishCoreInput
): Promise<RunPublishAnglePolishCoreResult> {
  const { provider, jobTopic, displayTitle, reportMarkdown, items, sourceRuns, opportunityIndex } =
    input;

  const itemUrlSet = new Set(items.map((r) => r.url.trim()));

  const publishAngles = buildPublishAnglesPhase1({
    reportMarkdown,
    items,
    sourceRuns,
    jobTopic,
  });

  const op = publishAngles.opportunities[opportunityIndex];
  if (!op) {
    return { ok: false, code: "INVALID_OPPORTUNITY_INDEX", message: "Invalid opportunity index" };
  }

  for (const c of op.citations) {
    if (!itemUrlSet.has(c.url.trim())) {
      return { ok: false, code: "INVALID_ANGLE_CITATIONS", message: "Citation URL not in items" };
    }
  }

  const snippetByUrl = new Map<string, string>();
  for (const row of items) {
    snippetByUrl.set(row.url.trim(), row.snippet);
  }

  const contextBlock = buildPublishAnglePolishContext({
    topic: jobTopic,
    displayTitle,
    workingTitle: op.workingTitle,
    dek: op.dek,
    whyItMatters: op.whyItMatters,
    outline: op.outline,
    citations: op.citations,
    snippetByUrl,
  });

  const { system, user } = buildPublishAnglePolishPrompts(contextBlock, op.outline.length);
  const result = await runThreadCompression(system, user, provider);

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  let rawJson: unknown;
  try {
    rawJson = extractJsonObject(result.text);
  } catch {
    return { ok: false, code: "AI_POLISH_BAD_OUTPUT", message: "Model returned invalid JSON" };
  }

  const parsedModel = publishAnglePolishModelSchema.safeParse(rawJson);
  if (!parsedModel.success) {
    return { ok: false, code: "AI_POLISH_BAD_OUTPUT", message: "Polish output failed validation" };
  }

  const sanitized = sanitizePolishModelFields(parsedModel.data);
  if (sanitized.bullets.length !== op.outline.length) {
    return { ok: false, code: "AI_POLISH_BAD_OUTPUT", message: "Polish bullet count mismatch" };
  }

  if (
    !isPolishOutputAcceptable({
      headline: sanitized.headline,
      dek: sanitized.dek,
      lead: sanitized.lead,
      bullets: sanitized.bullets,
      expectedBulletCount: op.outline.length,
    })
  ) {
    return { ok: false, code: "AI_POLISH_BAD_OUTPUT", message: "Polish quality check failed" };
  }

  const polishNote = polishMinimalChangeNote(op.workingTitle, op.dek, op.outline, {
    headline: sanitized.headline,
    dek: sanitized.dek,
    bullets: sanitized.bullets,
  });

  const citationsEcho: PublishAnglePolishResponse["citations"] = op.citations.map((c) => ({
    title: c.title.trim(),
    url: c.url.trim(),
    source: c.source,
  }));

  const payload: PublishAnglePolishResponse = {
    headline: sanitized.headline,
    dek: sanitized.dek,
    lead: sanitized.lead,
    bullets: sanitized.bullets,
    citations: citationsEcho,
    ...(polishNote ? { polishNote } : {}),
  };

  return { ok: true, payload };
}
