import type { AnimeTitle } from '@/data/models/anime';
import { NO_CAPABILITIES } from '@/data/models/anime';
import type { StoredListEntry } from '@/store/listsStore';
import type { WatchProgress } from '@/data/models/progress';

const CAPS = {
  ...NO_CAPABILITIES,
  search: true,
  metadata: true,
  episodes: true,
  streams: true,
  voiceovers: true,
  qualities: true,
  publicApi: true,
} as const;

/**
 * Builds a lightweight, openable title record from locally stored data.
 * Used by Home/Lists when the catalogue entry itself is not in memory — the
 * details modal then refreshes it from the provider.
 */
export function titleFromListEntry(entry: StoredListEntry): AnimeTitle {
  const refs = entry.refIds.length ? entry.refIds : [{ providerId: entry.providerId, refId: entry.titleId.split(':')[1] ?? entry.titleId }];
  const primary = refs[0]!;
  return {
    id: entry.titleId,
    providerId: primary.providerId,
    refId: primary.refId,
    title: entry.titleName,
    alternativeTitles: [],
    poster: entry.poster,
    genres: entry.genres,
    tags: [],
    status: 'unknown',
    type: 'UNKNOWN',
    episodesTotal: entry.episodesTotal,
    isMature: false,
    hasRussianVoice: true,
    providerRefs: refs,
    capabilities: CAPS,
  };
}

export function titleFromProgress(progress: WatchProgress, fallbackRef?: string): AnimeTitle {
  return {
    id: progress.titleId,
    providerId: progress.providerId,
    refId: fallbackRef ?? progress.titleId.split(':')[1] ?? progress.titleId,
    title: progress.titleName,
    alternativeTitles: [],
    poster: progress.poster,
    genres: [],
    tags: [],
    status: 'unknown',
    type: 'UNKNOWN',
    isMature: false,
    hasRussianVoice: true,
    providerRefs: [{ providerId: progress.providerId, refId: fallbackRef ?? progress.titleId.split(':')[1] ?? progress.titleId }],
    capabilities: CAPS,
  };
}
