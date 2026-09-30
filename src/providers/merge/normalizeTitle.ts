import type { AnimeTitle, ProviderRef } from '@/data/models/anime';
import { normalizeTitleText, similarity } from '@/core/utils/text';

export interface TitleIdentity {
  key: string;
  tokens: string[];
  year?: number;
  externalIds: Record<string, string>;
}

export function identityOf(title: AnimeTitle): TitleIdentity {
  const externalIds: Record<string, string> = {};
  for (const ref of title.providerRefs) externalIds[`${ref.providerId}:${ref.refId}`] = ref.refId;
  return {
    key: normalizeTitleText(title.titleEn || title.title),
    tokens: normalizeTitleText(title.titleEn || title.title).split(' ').filter(Boolean),
    year: title.year,
    externalIds,
  };
}

/** True when two provider entries describe the same logical anime. */
export function isSameTitle(a: AnimeTitle, b: AnimeTitle, threshold = 0.62): boolean {
  const yearCompatible = !a.year || !b.year || Math.abs(a.year - b.year) <= 1;
  if (!yearCompatible) {
    const strict = similarity(a.titleEn || a.title, b.titleEn || b.title);
    if (strict < 0.9) return false;
  }
  const score = Math.max(
    similarity(a.title, b.title),
    similarity(a.titleEn ?? a.title, b.titleEn ?? b.title),
    similarity(a.titleEn ?? a.title, b.title),
    similarity(a.title, b.titleEn ?? b.title),
  );
  if (score >= threshold) return true;
  const alternativeScore = a.alternativeTitles.reduce(
    (best, candidate) =>
      Math.max(
        best,
        similarity(candidate, b.title),
        similarity(candidate, b.titleEn ?? b.title),
      ),
    0,
  );
  return alternativeScore >= 0.85;
}

export function mergeProviderRefs(target: ProviderRef[], source: ProviderRef[]): ProviderRef[] {
  const seen = new Set(target.map((ref) => `${ref.providerId}:${ref.refId}`));
  const merged = [...target];
  for (const ref of source) {
    const key = `${ref.providerId}:${ref.refId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ref);
  }
  return merged;
}

export function mergeStrings(target: string[], source: string[]): string[] {
  const seen = new Set(target.map((value) => value.toLowerCase()));
  const merged = [...target];
  for (const value of source) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

export function preferValue<T>(a: T | undefined, b: T | undefined): T | undefined {
  return a !== undefined && a !== null && a !== ('' as unknown as T) ? a : b;
}
