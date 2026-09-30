import { env } from '@/core/config/env';
import { httpJson } from '@/core/http/httpClient';
import type { A365Episode, A365ListResponse, A365Series, A365Translation } from '@/providers/implementations/anime365/types';

const PROVIDER_ID = 'anime365';

export const SERIES_FIELDS = [
  'id',
  'title',
  'type',
  'year',
  'season',
  'poster',
  'genres',
  'duration',
  'episodesTotal',
  'description',
  'myanimelist_id',
  'anilist_id',
  'shikimori_id',
].join(',');

/**
 * Anime 365 (Smotret-Anime) public JSON API.
 * Verified endpoints: /series/ (search + details), /translations, /episodes.
 * Streaming from this source requires an authenticated session, therefore the
 * provider advertises streams:false instead of pretending to work.
 */
export class Anime365Api {
  constructor(private readonly baseUrl: string = env.anime365BaseUrl) {}

  private async request<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const response = await httpJson<T>(this.baseUrl, path, { query, providerId: PROVIDER_ID, timeoutMs: 12_000 });
    return response.data;
  }

  async searchSeries(query: string, page = 1, limit = 20): Promise<A365Series[]> {
    const data = await this.request<A365ListResponse<A365Series>>('/series/', {
      query,
      page,
      limit,
      fields: SERIES_FIELDS,
    });
    return data?.data ?? [];
  }

  async listSeries(page = 1, limit = 20): Promise<A365Series[]> {
    const data = await this.request<A365ListResponse<A365Series>>('/series/', { page, limit, fields: SERIES_FIELDS });
    return data?.data ?? [];
  }

  async series(id: number | string): Promise<A365Series | null> {
    const data = await this.request<{ data?: A365Series | null }>(`/series/${id}`, { fields: SERIES_FIELDS });
    return data?.data ?? null;
  }

  async translations(seriesId: number | string): Promise<A365Translation[]> {
    const data = await this.request<A365ListResponse<A365Translation>>('/translations', {
      seriesId,
      limit: 100,
      fields: 'id,type,title,authors,episode',
    });
    return data?.data ?? [];
  }

  async episodes(seriesId: number | string, limit = 200): Promise<A365Episode[]> {
    const data = await this.request<A365ListResponse<A365Episode>>('/episodes', {
      seriesId,
      limit,
      fields: 'id,seriesId,translationId,episode,episodeFull,name,duration,preview,intro,ending',
    });
    return data?.data ?? [];
  }

  async probe(): Promise<{ ok: boolean; latencyMs: number; count: number }> {
    const started = Date.now();
    try {
      const series = await this.listSeries(1, 1);
      return { ok: Array.isArray(series), latencyMs: Date.now() - started, count: series.length };
    } catch {
      return { ok: false, latencyMs: Date.now() - started, count: 0 };
    }
  }
}
