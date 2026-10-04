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
import { AnilibriaApi } from '@/providers/implementations/anilibria/api';
import {
  externalPlayerOf,
  mapEpisode,
  mapQualities,
  mapRelease,
  mapStreams,
  mapVoiceover,
  ANILIBRIA_ID,
} from '@/providers/implementations/anilibria/mapper';
import type { AnilibriaRelease } from '@/providers/implementations/anilibria/types';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth, StreamRequestOptions } from '@/providers/types';
import { applyFilters } from '@/providers/searchFilters';

const DESCRIPTOR: ProviderDescriptor = {
  id: ANILIBRIA_ID,
  name: 'AniLibria',
  descriptionKey: 'providers.anilibria.description',
  capabilities: {
    search: true,
    metadata: true,
    episodes: true,
    streams: true,
    voiceovers: true,
    qualities: true,
    schedule: true,
    publicApi: true,
  },
  homepage: 'https://aniliberty.top',
  enabledByDefault: true,
};

/**
 * AniLibria (AniLiberty) — primary provider.
 * Verified: /anime/catalog/releases, /app/search/releases, /anime/releases/{id}
 * (episodes with hls_480/720/1080 + opening/ending timecodes), /anime/genres, /app/status.
 */
export class AnilibriaProvider implements AnimeProvider {
  readonly descriptor = DESCRIPTOR;
  private readonly api: AnilibriaApi;
  private readonly releaseCache = new Map<string, { release: AnilibriaRelease; fetchedAt: number }>();

  constructor(api: AnilibriaApi = new AnilibriaApi()) {
    this.api = api;
  }

  private cacheRelease(release: AnilibriaRelease): AnimeTitle {
    this.releaseCache.set(String(release.id), { release, fetchedAt: Date.now() });
    if (this.releaseCache.size > 40) {
      const oldest = [...this.releaseCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
      if (oldest) this.releaseCache.delete(oldest[0]);
    }
    return mapRelease(release);
  }

  private async loadRelease(title: AnimeTitle): Promise<AnilibriaRelease> {
    const cached = this.releaseCache.get(title.refId);
    if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) return cached.release;
    const release = await this.api.release(title.refId);
    this.releaseCache.set(title.refId, { release, fetchedAt: Date.now() });
    return release;
  }

  async search(query: string, filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    const results = await this.api.search(query, 30);
    const items = applyFilters(
      results
        .filter((release) => (release.episodes_total ?? 0) > 0 || release.is_ongoing !== false)
        .map((release) => this.cacheRelease(release)),
      filters,
    );
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      totalItems: items.length,
      hasMore: items.length > start + pageSize,
    };
  }

  async discover(filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    const response = await this.api.catalog({
      limit: 24,
      page,
      genres: filters.genres
        .map((name) => this.genreIdByName(name))
        .filter((id): id is number => typeof id === 'number'),
      years: filters.years,
      isOngoing: filters.statuses.includes('ongoing') ? true : undefined,
      ordering: '-fresh_at',
    });
    const data = response.data ?? [];
    const pagination = response.meta?.pagination;
    return {
      // The catalogue endpoint answers identically with or without genres /
      // years / ordering (verified live), so the filters are applied here.
      items: applyFilters(data.map((release) => this.cacheRelease(release)), filters),
      page: pagination?.current_page ?? page,
      totalItems: pagination?.total ?? undefined,
      totalPages: pagination?.total_pages ?? undefined,
      hasMore: Boolean(pagination?.links?.next) || data.length >= 24,
    };
  }

  private genreMap: Record<string, number> | null = null;

  private genreIdByName(name: string): number | undefined {
    if (!this.genreMap) return undefined;
    return this.genreMap[name.toLowerCase()];
  }

  /**
   * Releases AniLibria does not host carry an official embed link in
   * `external_player`; the app plays it inside the provider's own player. A
   * media URL is never derived from it.
   */
  async getEmbedLink(title: AnimeTitle): Promise<string | undefined> {
    const release = await this.loadRelease(title);
    return externalPlayerOf(release).url;
  }

  async getTitle(refId: string): Promise<AnimeTitle> {
    const release = await this.api.release(refId);
    return this.cacheRelease(release);
  }

  async getEpisodes(title: AnimeTitle): Promise<Episode[]> {
    const release = await this.loadRelease(title);
    const episodes = release.episodes ?? [];
    if (!episodes.length) {
      throw new AppError({
        code: 'MISSING_EPISODE',
        providerId: ANILIBRIA_ID,
        message: `release ${release.id} has no episodes`,
      });
    }
    return episodes
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((episode) => mapEpisode(release.id, episode));
  }

  async getAvailableVoiceovers(title: AnimeTitle): Promise<Voiceover[]> {
    const release = await this.loadRelease(title);
    return [mapVoiceover(release)];
  }

  async getAvailableQualities(title: AnimeTitle, episode: Episode): Promise<QualityVariant[]> {
    const release = await this.loadRelease(title);
    const raw = (release.episodes ?? []).find((item) => item.id === episode.refId || item.ordinal === episode.ordinal);
    if (!raw) return [];
    return mapQualities(mapStreams(release.id, raw, episode));
  }

  async getStream(title: AnimeTitle, episode: Episode, options: StreamRequestOptions = {}): Promise<StreamBundle> {
    const release = await this.loadRelease(title);
    const raw = (release.episodes ?? []).find((item) => item.id === episode.refId || item.ordinal === episode.ordinal);
    if (!raw) {
      throw new AppError({
        code: 'MISSING_EPISODE',
        providerId: ANILIBRIA_ID,
        message: `episode ${episode.ordinal} is not present in release ${release.id}`,
      });
    }
    const sources = mapStreams(release.id, raw, episode);
    if (!sources.length) {
      throw new AppError({
        code: 'STREAM_UNAVAILABLE',
        providerId: ANILIBRIA_ID,
        message: 'no HLS renditions published for this episode yet',
      });
    }
    const ordered = options.qualityId
      ? [...sources].sort((a, b) => (a.qualityId === options.qualityId ? -1 : b.qualityId === options.qualityId ? 1 : 0))
      : sources;
    return {
      episodeId: episode.id,
      providerId: ANILIBRIA_ID,
      sources: ordered,
      voiceover: mapVoiceover(release),
    };
  }

  async getGenres(): Promise<string[]> {
    const genres = await this.api.genres();
    if (!this.genreMap) {
      this.genreMap = Object.fromEntries(genres.map((genre) => [genre.name.toLowerCase(), genre.id]));
    }
    return genres.map((genre) => genre.name);
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    const ongoing = await this.api.ongoing(24);
    return ongoing.map((release) => this.cacheRelease(release));
  }

  async healthCheck(): Promise<ProviderHealth> {
    const probe = await this.api.probe();
    if (!probe.ok) {
      return {
        providerId: ANILIBRIA_ID,
        status: 'down',
        checkedAt: Date.now(),
        latencyMs: probe.latencyMs,
        errorCode: 'PROVIDER_UNAVAILABLE',
        errorMessage: 'status endpoint unreachable',
      };
    }
    return {
      providerId: ANILIBRIA_ID,
      status: probe.latencyMs > 2500 ? 'degraded' : 'healthy',
      checkedAt: Date.now(),
      latencyMs: probe.latencyMs,
      details: { viaMirror: probe.viaMirror, mirrors: probe.endpoints.join(',') },
    };
  }
}
