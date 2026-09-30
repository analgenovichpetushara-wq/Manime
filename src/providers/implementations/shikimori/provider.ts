import type { AnimeTitle, Paged, SearchFilters } from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';
import { httpJson } from '@/core/http/httpClient';
import { APP_USER_AGENT, env } from '@/core/config/env';
import { mapShikimoriAnime, SHIKIMORI_ID } from '@/providers/implementations/shikimori/mapper';
import type { ShikimoriAnime } from '@/providers/implementations/shikimori/types';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';

const DESCRIPTOR: ProviderDescriptor = {
  id: SHIKIMORI_ID,
  name: 'Shikimori',
  descriptionKey: 'providers.shikimori.description',
  capabilities: {
    search: true,
    metadata: true,
    episodes: false,
    streams: false,
    voiceovers: false,
    qualities: false,
    schedule: false,
    publicApi: true,
  },
  homepage: 'https://shikimori.io',
  enabledByDefault: true,
};

/**
 * Shikimori REST API — metadata provider.
 * Adds Russian titles, genres, scores and poster art to entries discovered from
 * streaming providers. It intentionally exposes no episodes and no streams.
 */
export class ShikimoriProvider implements AnimeProvider {
  readonly descriptor = DESCRIPTOR;
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.shikimoriBaseUrl) {
    this.baseUrl = baseUrl;
  }

  private async request(path: string, query?: Record<string, string | number | undefined>): Promise<unknown> {
    const response = await httpJson<unknown>(this.baseUrl, path, {
      query,
      providerId: SHIKIMORI_ID,
      headers: { 'User-Agent': APP_USER_AGENT },
      timeoutMs: 10_000,
    });
    return response.data;
  }

  async search(query: string, filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    const data = (await this.request('/animes', {
      search: query,
      limit: 20,
      page,
      kind: filters.statuses.includes('ongoing') ? undefined : undefined,
    })) as ShikimoriAnime[];
    const items = Array.isArray(data) ? data.map(mapShikimoriAnime) : [];
    return { items, page, hasMore: items.length >= 20 };
  }

  async discover(filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    const data = (await this.request('/animes', {
      limit: 20,
      page,
      order: 'popularity',
      season: filters.years.length ? undefined : undefined,
      status: filters.statuses[0],
    })) as ShikimoriAnime[];
    const items = Array.isArray(data) ? data.map(mapShikimoriAnime) : [];
    return { items, page, hasMore: items.length >= 20 };
  }

  async getTitle(refId: string): Promise<AnimeTitle> {
    const data = (await this.request(`/animes/${refId}`)) as ShikimoriAnime;
    if (!data || typeof data !== 'object' || !('id' in data)) {
      throw new AppError({ code: 'NOT_FOUND', providerId: SHIKIMORI_ID, message: `anime ${refId} not found` });
    }
    return mapShikimoriAnime(data);
  }

  async getEpisodes(): Promise<never[]> {
    return [];
  }

  async getAvailableVoiceovers(): Promise<never[]> {
    return [];
  }

  async getAvailableQualities(): Promise<never[]> {
    return [];
  }

  async getStream(): Promise<never> {
    throw new AppError({
      code: 'STREAM_UNAVAILABLE',
      providerId: SHIKIMORI_ID,
      message: 'Shikimori is a metadata source and never provides video streams',
    });
  }

  async getGenres(): Promise<string[]> {
    const data = (await this.request('/genres')) as { russian?: string; name?: string }[];
    if (!Array.isArray(data)) return [];
    return data.map((genre) => genre.russian || genre.name || '').filter(Boolean);
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    return [];
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      await this.request('/animes', { limit: 1 });
      const latencyMs = Date.now() - started;
      return {
        providerId: SHIKIMORI_ID,
        status: latencyMs > 2500 ? 'degraded' : 'healthy',
        checkedAt: Date.now(),
        latencyMs,
      };
    } catch (error) {
      return {
        providerId: SHIKIMORI_ID,
        status: 'down',
        checkedAt: Date.now(),
        latencyMs: Date.now() - started,
        errorCode: 'PROVIDER_UNAVAILABLE',
        errorMessage: error instanceof Error ? error.message : 'unreachable',
      };
    }
  }
}
