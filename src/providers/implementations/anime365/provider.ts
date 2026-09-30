import type {
  AnimeTitle,
  Episode,
  Paged,
  QualityVariant,
  SearchFilters,
  StreamBundle,
  Voiceover,
} from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';
import { Anime365Api } from '@/providers/implementations/anime365/api';
import { mapEpisode, mapSeries, mapTranslation, ANIME365_ID } from '@/providers/implementations/anime365/mapper';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';

const DESCRIPTOR: ProviderDescriptor = {
  id: ANIME365_ID,
  name: 'Anime 365 (Smotret-Anime)',
  descriptionKey: 'providers.anime365.description',
  unavailableReasonKey: 'providers.anime365.streamsRequireAuth',
  capabilities: {
    search: true,
    metadata: true,
    episodes: true,
    streams: false,
    voiceovers: true,
    qualities: false,
    schedule: false,
    publicApi: true,
  },
  homepage: 'https://smotret-anime.online',
  enabledByDefault: true,
};

/**
 * Anime 365 — Russian voiceover catalogue with episode metadata.
 * Streams are intentionally NOT advertised: the public API does not expose
 * playback URLs without an authenticated account, and AnimAlc never bypasses
 * authentication.
 */
export class Anime365Provider implements AnimeProvider {
  readonly descriptor = DESCRIPTOR;

  constructor(private readonly api: Anime365Api = new Anime365Api()) {}

  async search(query: string, _filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    const series = await this.api.searchSeries(query, page, 20);
    return {
      items: series.map(mapSeries),
      page,
      totalItems: series.length,
      hasMore: series.length >= 20,
    };
  }

  async discover(_filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    const series = await this.api.listSeries(page, 20);
    return { items: series.map(mapSeries), page, hasMore: series.length >= 20 };
  }

  async getTitle(refId: string): Promise<AnimeTitle> {
    const series = await this.api.series(refId);
    if (!series) {
      throw new AppError({ code: 'NOT_FOUND', providerId: ANIME365_ID, message: `series ${refId} not found` });
    }
    return mapSeries(series);
  }

  async getEpisodes(title: AnimeTitle): Promise<Episode[]> {
    const episodes = await this.api.episodes(title.refId);
    return episodes
      .map((episode) => mapEpisode(title.refId, episode))
      .sort((a, b) => a.ordinal - b.ordinal);
  }

  async getAvailableVoiceovers(title: AnimeTitle): Promise<Voiceover[]> {
    const translations = await this.api.translations(title.refId);
    return translations.map((translation) => mapTranslation(translation, title.refId));
  }

  async getAvailableQualities(): Promise<QualityVariant[]> {
    return [];
  }

  async getStream(): Promise<StreamBundle> {
    throw new AppError({
      code: 'STREAM_UNAVAILABLE',
      providerId: ANIME365_ID,
      message: 'Anime 365 exposes playback only to authenticated sessions; AnimAlc does not bypass authentication',
    });
  }

  async getGenres(): Promise<string[]> {
    const series = await this.api.listSeries(1, 50);
    const genres = new Set<string>();
    series.forEach((item) => (item.genres ?? []).forEach((genre) => genres.add(genre)));
    return [...genres];
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    return [];
  }

  async healthCheck(): Promise<ProviderHealth> {
    const probe = await this.api.probe();
    return {
      providerId: ANIME365_ID,
      status: probe.ok ? (probe.latencyMs > 2500 ? 'degraded' : 'healthy') : 'down',
      checkedAt: Date.now(),
      latencyMs: probe.latencyMs,
      errorCode: probe.ok ? undefined : 'PROVIDER_UNAVAILABLE',
      details: { streams: false, samples: probe.count },
    };
  }
}
