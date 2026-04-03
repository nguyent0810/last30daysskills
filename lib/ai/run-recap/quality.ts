import type { RecapLanguage } from "./prompt";

function headingPatterns(language: RecapLanguage): {
  summary: RegExp;
  themes: RegExp;
  examples: RegExp;
  takeaway: RegExp;
} {
  if (language === "ja") {
    return {
      summary: /^要約[:：]/im,
      themes: /^主要テーマ[:：]/im,
      examples: /^具体例[:：]/im,
      takeaway: /^示唆[:：]/im,
    };
  }
  if (language === "vi") {
    return {
      summary: /^tóm tắt[:：]/im,
      themes: /^chủ đề chính[:：]/im,
      examples: /^ví dụ[:：]/im,
      takeaway: /^kết luận[:：]/im,
    };
  }
  return {
    summary: /^summary[:：]/im,
    themes: /^main themes[:：]/im,
    examples: /^examples[:：]/im,
    takeaway: /^takeaway[:：]/im,
  };
}

export function isRecapOutputAcceptable(text: string, language: RecapLanguage): boolean {
  const t = text.trim();
  if (!t || t.length < 80) return false;

  const h = headingPatterns(language);
  const hasSummary = h.summary.test(t);
  const hasThemes = h.themes.test(t);
  const hasExamples = h.examples.test(t);
  const hasTakeaway = h.takeaway.test(t);

  if (!(hasSummary && hasThemes && hasExamples && hasTakeaway)) return false;

  const bulletCount = (t.match(/^\s*[-•]\s+/gm) ?? []).length;
  return bulletCount >= 3;
}

