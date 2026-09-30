import en from '@/i18n/strings/en.json';
import ru from '@/i18n/strings/ru.json';
import type { AppLanguage } from '@/data/models/settings';

export type TextDictionary = Record<string, string>;
export type TextOverrides = Record<string, Partial<Record<AppLanguage, string>>>;

export const BUNDLED_TEXTS: Record<AppLanguage, TextDictionary> = {
  ru: ru as TextDictionary,
  en: en as TextDictionary,
};

export const FALLBACK_LANGUAGE: AppLanguage = 'ru';

export function availableKeys(language: AppLanguage = FALLBACK_LANGUAGE): string[] {
  return Object.keys(BUNDLED_TEXTS[language] ?? {});
}

export function originalText(key: string, language: AppLanguage): string {
  const dictionary = BUNDLED_TEXTS[language] ?? {};
  const fallback = BUNDLED_TEXTS[FALLBACK_LANGUAGE] ?? {};
  return overridesSafeGet(dictionary, key) ?? overridesSafeGet(fallback, key) ?? key;
}

function overridesSafeGet(dictionary: TextDictionary, key: string): string | undefined {
  const value = dictionary[key];
  return typeof value === 'string' ? value : undefined;
}

/** Resolves a string id for a language, honouring user overrides. */
export function translate(
  key: string,
  language: AppLanguage,
  overrides: TextOverrides = {},
  replacements?: Record<string, string | number>,
): string {
  const custom = overrides[key]?.[language] ?? overrides[key]?.[FALLBACK_LANGUAGE];
  const base = custom && custom.length > 0 ? custom : originalText(key, language);
  if (!replacements) return base;
  return interpolate(base, replacements);
}

export function interpolate(template: string, replacements: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = replacements[token];
    return value === undefined ? match : String(value);
  });
}

export function extractPlaceholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').filter(Boolean);
}

/** Validates that a custom value still contains every placeholder of the original. */
export function validateOverride(original: string, candidate: string): { valid: boolean; missing: string[] } {
  const expected = new Set(extractPlaceholders(original));
  const actual = new Set(extractPlaceholders(candidate));
  const missing = [...expected].filter((token) => !actual.has(token));
  return { valid: missing.length === 0, missing };
}

export function setOverride(
  overrides: TextOverrides,
  key: string,
  language: AppLanguage,
  value: string,
): TextOverrides {
  const trimmed = value.trim();
  const next: TextOverrides = { ...overrides };
  const entry = { ...(next[key] ?? {}) };
  if (!trimmed || trimmed === originalText(key, language)) {
    delete entry[language];
  } else {
    entry[language] = trimmed;
  }
  if (Object.keys(entry).length === 0) delete next[key];
  else next[key] = entry;
  return next;
}

export function clearOverrides(): TextOverrides {
  return {};
}

export function countOverrides(overrides: TextOverrides): number {
  return Object.keys(overrides).length;
}

export function exportOverrides(overrides: TextOverrides): string {
  return JSON.stringify(overrides, null, 2);
}

/** Imports a previously exported override document, ignoring malformed input. */
export function importOverrides(raw: string): { overrides: TextOverrides; imported: number } {
  try {
    const parsed = JSON.parse(raw) as TextOverrides;
    const overrides: TextOverrides = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!availableKeys().includes(key)) continue;
      if (!value || typeof value !== 'object') continue;
      const entry: Partial<Record<AppLanguage, string>> = {};
      if (typeof value.ru === 'string') entry.ru = value.ru;
      if (typeof value.en === 'string') entry.en = value.en;
      if (Object.keys(entry).length) overrides[key] = entry;
    }
    return { overrides, imported: Object.keys(overrides).length };
  } catch {
    return { overrides: {}, imported: 0 };
  }
}
