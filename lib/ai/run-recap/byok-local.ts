export const GEMINI_BYOK_STORAGE_KEY = "crm_ai_recap_gemini_api_key";

export function readLocalGeminiApiKey(): string | null {
  try {
    const v = localStorage.getItem(GEMINI_BYOK_STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function writeLocalGeminiApiKey(value: string): string | null {
  const trimmed = value.trim();
  try {
    if (!trimmed) {
      localStorage.removeItem(GEMINI_BYOK_STORAGE_KEY);
      return null;
    }
    localStorage.setItem(GEMINI_BYOK_STORAGE_KEY, trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

export function clearLocalGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_BYOK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

