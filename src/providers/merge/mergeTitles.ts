import type { AnimeTitle } from '@/data/models/anime';
import { isSameTitle, mergeProviderRefs, mergeStrings, preferValue } from '@/providers/merge/normalizeTitle';

/**
 * Merges catalogue entries coming from different providers into one logical
 * anime record so the UI never shows duplicates.
 *
 * Priority rules:
 *  - a provider that can actually stream wins the "primary" position;
 *  - metadata is filled from the richest entry;
 *  - all provider references are preserved for playback fallback.
 */
export function mergeTitleEntries(entries: AnimeTitle[], streamCapableIds: string[] = []): AnimeTitle[] {
  const streamCapable = new Set(streamCapableIds);
  const result: AnimeTitle[] = [];

  const ranked = [...entries].sort((a, b) => scoreEntry(b, streamCapable) - scoreEntry(a, streamCapable));

  for (const entry of ranked) {
    const existingIndex = result.findIndex((candidate) => isSameTitle(candidate, entry));
    if (existingIndex === -1) {
      result.push({ ...entry, providerRefs: mergeProviderRefs([], entry.providerRefs) });
      continue;
    }
    const existing = result[existingIndex];
    if (!existing) continue;
    result[existingIndex] = combine(existing, entry);
  }

  return result.map((entry) => ({
    ...entry,
    capabilities: { ...entry.capabilities },
    genres: mergeStrings([], entry.genres),
    tags: mergeStrings([], entry.tags),
  }));
}

function scoreEntry(entry: AnimeTitle, streamCapable: Set<string>): number {
  let score = 0;
  if (streamCapable.size === 0 || streamCapable.has(entry.providerId)) score += 4;
  if (entry.capabilities.search) score += 1;
  if (entry.synopsis) score += 1;
  if (entry.poster) score += 1;
  if (entry.genres.length) score += 1;
  if (entry.episodesTotal) score += 1;
  if (entry.rating) score += 0.5;
  return score;
}

function combine(primary: AnimeTitle, secondary: AnimeTitle): AnimeTitle {
  const primaryCanStream = primary.capabilities.streams;
  const secondaryCanStream = secondary.capabilities.streams;
  const head = primaryCanStream || !secondaryCanStream ? primary : secondary;
  const tail = head === primary ? secondary : primary;

  return {
    ...head,
    title: preferValue(head.title, tail.title) ?? head.title,
    titleEn: preferValue(head.titleEn, tail.titleEn),
    titleOriginal: preferValue(head.titleOriginal, tail.titleOriginal),
    alternativeTitles: mergeStrings(head.alternativeTitles, [tail.title, ...tail.alternativeTitles]),
    poster: preferValue(head.poster, tail.poster),
    background: preferValue(head.background, tail.background),
    synopsis: (head.synopsis?.length ?? 0) >= (tail.synopsis?.length ?? 0) ? head.synopsis : tail.synopsis,
    genres: mergeStrings(head.genres, tail.genres),
    tags: mergeStrings(head.tags, tail.tags),
    year: preferValue(head.year, tail.year),
    season: preferValue(head.season, tail.season),
    status: head.status !== 'unknown' ? head.status : tail.status,
    type: head.type !== 'UNKNOWN' ? head.type : tail.type,
    episodesTotal: Math.max(head.episodesTotal ?? 0, tail.episodesTotal ?? 0) || undefined,
    averageEpisodeDurationSec: preferValue(head.averageEpisodeDurationSec, tail.averageEpisodeDurationSec),
    rating: Math.max(head.rating ?? 0, tail.rating ?? 0) || undefined,
    ratingVotes: Math.max(head.ratingVotes ?? 0, tail.ratingVotes ?? 0) || undefined,
    ageRating: preferValue(head.ageRating, tail.ageRating),
    isMature: head.isMature || tail.isMature,
    hasRussianVoice: head.hasRussianVoice || tail.hasRussianVoice,
    updatedAt: Math.max(head.updatedAt ?? 0, tail.updatedAt ?? 0) || undefined,
    providerRefs: mergeProviderRefs(head.providerRefs, tail.providerRefs),
    capabilities: {
      search: head.capabilities.search || tail.capabilities.search,
      metadata: head.capabilities.metadata || tail.capabilities.metadata,
      episodes: head.capabilities.episodes || tail.capabilities.episodes,
      streams: head.capabilities.streams || tail.capabilities.streams,
      voiceovers: head.capabilities.voiceovers || tail.capabilities.voiceovers,
      qualities: head.capabilities.qualities || tail.capabilities.qualities,
      schedule: head.capabilities.schedule || tail.capabilities.schedule,
      publicApi: head.capabilities.publicApi && tail.capabilities.publicApi,
    },
  };
}
