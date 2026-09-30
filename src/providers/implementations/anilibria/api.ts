import { env } from '@/core/config/env';
import { AppError } from '@/core/errors/AppError';
import { httpJson } from '@/core/http/httpClient';
import type {
  AnilibriaGenre,
  AnilibriaPagedResponse,
  AnilibriaRelease,
  AnilibriaStatusResponse,
} from '@/providers/implementations/anilibria/types';

const PROVIDER_ID = 'anilibria';

export interface AnilibriaCatalogQuery {
  limit?: number;
  page?: number;
  genres?: number[];
  years?: number[];
  isOngoing?: boolean;
  ordering?: string;
}

export function apiOrigin(baseUrl: string = env.anilibriaBaseUrl): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return 'https://api.anilibria.app';
  }
}

/** Absolute-ises relative storage paths returned by the API. */
export function absoluteMediaUrl(path?: string | null, baseUrl: string = env.anilibriaBaseUrl): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('//')) return `https:${path}`;
  return `${apiOrigin(baseUrl)}${path.startsWith('/') ? '' : '/'}${path}`;
}

export interface AnilibriaClientOptions {
  baseUrl?: string;
  mirrorBaseUrl?: string;
}

/**
 * Thin, typed wrapper over the public AniLiberty REST API (v1).
 * Endpoints are the documented public ones; both the primary host and the
 * official mirror are usable for automatic failover.
 */
export class AnilibriaApi {
  readonly baseUrl: string;
  readonly mirrorBaseUrl: string;

  constructor(options: AnilibriaClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? env.anilibriaBaseUrl;
    this.mirrorBaseUrl = options.mirrorBaseUrl ?? env.anilibriaMirrorBaseUrl;
  }

  get origin(): string {
    return apiOrigin(this.baseUrl);
  }

  private async request<T>(path: string, query?: Record<string, string | number | boolean | undefined>, useMirror = false): Promise<T> {
    const base = useMirror ? this.mirrorBaseUrl : this.baseUrl;
    const response = await httpJson<T>(base, path, { query, providerId: PROVIDER_ID, timeoutMs: 12_000 });
    return response.data;
  }

  /** Catalog browse with filters (verified parameters: limit, page, genres, years, is_ongoing, ordering). */
  async catalog(query: AnilibriaCatalogQuery): Promise<AnilibriaPagedResponse<AnilibriaRelease>> {
    return this.request<AnilibriaPagedResponse<AnilibriaRelease>>('/anime/catalog/releases', {
      limit: query.limit ?? 20,
      page: query.page,
      genres: query.genres?.length ? query.genres.join(',') : undefined,
      years: query.years?.length ? query.years.join(',') : undefined,
      is_ongoing: query.isOngoing,
      ordering: query.ordering,
    });
  }

  /** Free-text search endpoint used by the mobile app. */
  async search(query: string, limit = 20): Promise<AnilibriaRelease[]> {
    const data = await this.request<AnilibriaRelease[] | AnilibriaPagedResponse<AnilibriaRelease>>('/app/search/releases', {
      query,
      limit,
    });
    if (Array.isArray(data)) return data;
    return data?.data ?? [];
  }

  async release(id: number | string): Promise<AnilibriaRelease> {
    const data = await this.request<AnilibriaRelease>(`/anime/releases/${id}`);
    if (!data || typeof data !== 'object' || !('id' in data)) {
      throw new AppError({ code: 'INVALID_PAYLOAD', providerId: PROVIDER_ID, message: 'release payload malformed' });
    }
    return data;
  }

  async genres(): Promise<AnilibriaGenre[]> {
    const data = await this.request<AnilibriaGenre[]>('/anime/genres');
    return Array.isArray(data) ? data : [];
  }

  async status(): Promise<AnilibriaStatusResponse> {
    return this.request<AnilibriaStatusResponse>('/app/status');
  }

  /** On-going releases ordered by freshness — the closest public equivalent of a schedule. */
  async ongoing(limit = 20): Promise<AnilibriaRelease[]> {
    const response = await this.catalog({ limit, isOngoing: true, ordering: '-fresh_at' });
    return response.data ?? [];
  }

  /** Health probe against the primary host with automatic mirror fallback. */
  async probe(): Promise<{ ok: boolean; viaMirror: boolean; latencyMs: number; endpoints: string[] }> {
    const started = Date.now();
    try {
      const status = await this.status();
      return {
        ok: status?.is_alive === true,
        viaMirror: false,
        latencyMs: Date.now() - started,
        endpoints: status?.available_api_endpoints ?? [],
      };
    } catch {
      try {
        const status = await this.request<AnilibriaStatusResponse>('/app/status', undefined, true);
        return {
          ok: status?.is_alive === true,
          viaMirror: true,
          latencyMs: Date.now() - started,
          endpoints: status?.available_api_endpoints ?? [],
        };
      } catch {
        return { ok: false, viaMirror: false, latencyMs: Date.now() - started, endpoints: [] };
      }
    }
  }
}

export const anilibriaApi = new AnilibriaApi();
