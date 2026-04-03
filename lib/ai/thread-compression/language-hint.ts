/**
 * Deterministic output-language hints for thread compression (V1).
 * 1) Vietnamese if topic or display title clearly Vietnamese
 * 2) Else dominant script in full context (vi / zh / ja)
 * 3) Else English (mixed / unclear)
 */

const VI_MARK = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/;

const CJK = /[\u4e00-\u9fff]/;
const KANA = /[\u3040-\u30ff]/;

export type OutputLanguageKind = "vi" | "en" | "zh" | "ja";

function hasVietnameseMarks(s: string): boolean {
  return VI_MARK.test(s);
}

function letterLikeCount(s: string): number {
  return (s.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

function countMatches(s: string, re: RegExp): number {
  const g = re.global ? re : new RegExp(re.source, `${re.flags}g`);
  const m = s.match(g);
  return m ? m.length : 0;
}

/**
 * Returns which language the model should write in, with deterministic rules.
 */
export function resolveOutputLanguage(
  topic: string,
  displayTitle: string | null | undefined,
  fullContext: string
): OutputLanguageKind {
  const title = (displayTitle ?? "").trim();
  const t = topic.trim();
  if (hasVietnameseMarks(t) || hasVietnameseMarks(title)) {
    return "vi";
  }

  const body = fullContext;
  const letters = Math.max(1, letterLikeCount(body));
  const viScore = countMatches(body, VI_MARK) / letters;
  const cjkScore = countMatches(body, CJK) / letters;
  const kanaScore = countMatches(body, KANA) / letters;

  const threshold = 0.08;
  if (viScore >= threshold && viScore >= cjkScore && viScore >= kanaScore) {
    return "vi";
  }
  if (cjkScore >= threshold && cjkScore >= kanaScore) {
    return "zh";
  }
  if (kanaScore >= threshold) {
    return "ja";
  }

  return "en";
}

export function languageInstruction(kind: OutputLanguageKind): string {
  switch (kind) {
    case "vi":
      return "Write your entire response in Vietnamese.";
    case "zh":
      return "Write your entire response in Chinese, matching the primary language of the context.";
    case "ja":
      return "Write your entire response in Japanese, matching the primary language of the context.";
    default:
      return "Write your entire response in English.";
  }
}
