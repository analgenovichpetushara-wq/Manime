import type { AppLanguage } from '@/data/models/settings';

const LOCALES: Record<AppLanguage, string> = { ru: 'ru-RU', en: 'en-GB' };

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${Math.round(ratio * 100)}%`;
}

export function formatCompactNumber(value: number, language: AppLanguage = 'ru'): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat(LOCALES[language], { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatDate(timestamp: number, language: AppLanguage = 'ru'): string {
  try {
    return new Date(timestamp).toLocaleDateString(LOCALES[language]);
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}

export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
