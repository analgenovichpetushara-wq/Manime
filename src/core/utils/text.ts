const DIACRITICS = /[\u0300-\u036f]/g;

export function normalizeTitleText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9а-яё\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'season', 'part', 'сезон', 'часть']);

export function titleTokens(value: string | null | undefined): string[] {
  return normalizeTitleText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function similarity(a: string, b: string): number {
  const left = normalizeTitleText(a);
  const right = normalizeTitleText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const aTokens = new Set(titleTokens(left));
  const bTokens = new Set(titleTokens(right));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of aTokens) if (bTokens.has(token)) intersection += 1;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = intersection / union;
  const contains = left.includes(right) || right.includes(left) ? 0.25 : 0;
  return Math.min(1, jaccard + contains);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .trim();
}

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}
