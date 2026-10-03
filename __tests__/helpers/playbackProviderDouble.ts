import type {
  AnimeTitle,
  Episode,
  Paged,
  QualityVariant,
  StreamBundle,
  Voiceover,
} from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';
import { getProviderManager } from '@/services/providerService';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';

export const PLAYBACK_DOUBLE_ID = 'playback-double';

/**
 * Test double for the streaming half of the pipeline.
 *
 * Kodik (the shipped primary source) publishes an embed player link, not a
 * media URL, so the player/progress chain is exercised against this in-test
 * provider. It is a test fixture — it is never registered by the app itself.
 */
export function createPlaybackDouble(options: {
  title: AnimeTitle;
  episodes: Episode[];
  voiceovers?: Voiceover[];
  qualities?: QualityVariant[];
  /** Return no sources to simulate a provider-side stream failure. */
  failStreams?: boolean;
}): AnimeProvider & { descriptor: ProviderDescriptor } {
  const descriptor: ProviderDescriptor = {
    id: PLAYBACK_DOUBLE_ID,
    name: 'Playback double',
    descriptionKey: 'providers.kodik.description',
    capabilities: {
      search: true,
      metadata: true,
      episodes: true,
      streams: true,
      voiceovers: true,
      qualities: true,
      schedule: false,
      publicApi: true,
    },
    homepage: 'https://example.invalid',
    enabledByDefault: true,
  };

  const voiceovers: Voiceover[] =
    options.voiceovers ?? [
      {
        id: `${PLAYBACK_DOUBLE_ID}:v1`,
        titleId: options.title.id,
        providerId: PLAYBACK_DOUBLE_ID,
        refId: 'v1',
        name: 'Русская озвучка',
        kind: 'voice',
        language: 'ru',
        isDefault: true,
      },
    ];

  const qualities: QualityVariant[] =
    options.qualities ?? [
      { id: '720p', label: '720p', height: 720, kind: 'hls' },
      { id: '480p', label: '480p', height: 480, kind: 'hls' },
    ];

  return {
    descriptor,
    async search(): Promise<Paged<AnimeTitle>> {
      return { items: [options.title], page: 1, hasMore: false };
    },
    async getTitle(): Promise<AnimeTitle> {
      return options.title;
    },
    async getEpisodes(): Promise<Episode[]> {
      return options.episodes;
    },
    async getAvailableVoiceovers(): Promise<Voiceover[]> {
      return voiceovers;
    },
    async getAvailableQualities(): Promise<QualityVariant[]> {
      return qualities;
    },
    async getStream(title: AnimeTitle, episode: Episode): Promise<StreamBundle> {
      if (options.failStreams) {
        throw new AppError({ code: 'STREAM_UNAVAILABLE', providerId: PLAYBACK_DOUBLE_ID, message: 'no sources' });
      }
      return {
        episodeId: episode.id,
        providerId: PLAYBACK_DOUBLE_ID,
        voiceover: voiceovers[0],
        sources: qualities.map((quality, index) => ({
          id: `${PLAYBACK_DOUBLE_ID}:${episode.id}:${quality.id}`,
          providerId: PLAYBACK_DOUBLE_ID,
          titleId: title.id,
          episodeId: episode.id,
          voiceoverId: voiceovers[0]?.id,
          url: `https://cdn.example.invalid/${episode.id}/${quality.height}.m3u8`,
          kind: 'hls' as const,
          label: quality.label,
          height: quality.height,
          qualityId: quality.id,
          isDefault: index === 0,
        })),
      };
    },
    async discover(): Promise<Paged<AnimeTitle>> {
      return { items: [options.title], page: 1, hasMore: false };
    },
    async getGenres(): Promise<string[]> {
      return options.title.genres;
    },
    async getSchedule(): Promise<AnimeTitle[]> {
      return [];
    },
    async healthCheck(): Promise<ProviderHealth> {
      return { providerId: PLAYBACK_DOUBLE_ID, status: 'healthy', checkedAt: Date.now(), latencyMs: 1 };
    },
  };
}

/** Registers the double with the app-wide manager and links it to a title. */
export function registerPlaybackDouble(options: {
  title: AnimeTitle;
  episodes: Episode[];
  failStreams?: boolean;
}): AnimeTitle {
  const double = createPlaybackDouble(options);
  getProviderManager().register(double);
  return {
    ...options.title,
    providerRefs: [
      { providerId: PLAYBACK_DOUBLE_ID, refId: options.title.refId },
      ...options.title.providerRefs.filter((ref) => ref.providerId !== PLAYBACK_DOUBLE_ID),
    ],
  };
}

export function unregisterPlaybackDouble(): void {
  getProviderManager().unregister(PLAYBACK_DOUBLE_ID);
}
