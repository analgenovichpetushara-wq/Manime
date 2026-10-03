import type {
  AnimeStatus,
  AnimeTitle,
  Episode,
  Paged,
  QualityVariant,
  SearchFilters,
  StreamBundle,
  Voiceover,
} from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';
import { env } from '@/core/config/env';
import { KodikApi, KODIK_ID } from '@/providers/implementations/kodik/api';
import {
  KODIK_PROVIDER_ID,
  mapEpisodes,
  mapQualities,
  mapRelease,
  mapVoiceovers,
} from '@/providers/implementations/kodik/mapper';
import type { KodikQueryParams, KodikRelease } from '@/providers/implementations/kodik/types';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';

const PAGE_SIZE = 20;

const CAPABILITIES = {
  search: true,
  metadata: true,
  episodes: true,
  /**
   * Kodik's documented API exposes the official embed player link, not a media
   * URL. Direct video links are produced by the player's obfuscated internal
   * endpoint, which AnimAlc does not touch — so streams stay `false` instead of
   * being faked or extracted around a technical protection.
   */
  streams: false,
  voiceovers: true,
  qualities: true,
  schedule: false,
  publicApi: false,
} as const;

const DESCRIPTOR: ProviderDescriptor = {
  id: KODIK_ID,
  name: 'Kodik',
  descriptionKey: 'providers.kodik.description',
  unavailableReasonKey: 'providers.kodik.requiresToken',
  capabilities: CAPABILITIES,
  homepage: 'https://kodik.info',
  enabledByDefault: true,
};

function statusFilter(statuses: AnimeStatus[]): string | undefined {
  const mapped = statuses
    .map((status) => (status === 'released' ? 'released' : status === 'ongoing' ? 'ongoing' : status === 'announced' ? 'anons' : ''))
    .filter(Boolean);
  return mapped.length ? mapped[0] : undefined;
}

/**
 * Kodik provider.
 *
 * Everything comes from the documented `/search` and `/list` endpoints with a
 * partner token. The token either lives in the gateway (production) or in
 * `EXPO_PUBLIC_KODIK_TOKEN` (local development only) — never hardcoded.
 */
export class KodikProvider implements AnimeProvider {
  readonly descriptor = DESCRIPTOR;

  constructor(private readonly api: KodikApi = new KodikApi()) {}

  get isConfigured(): boolean {
    return this.api.isConfigured;
  }

  private assertConfigured(): void {
    if (this.isConfigured) return;
    throw new AppError({
      code: 'AUTHENTICATION_REQUIRED',
      providerId: KODIK_ID,
      message: 'Kodik needs a partner API token (gateway or EXPO_PUBLIC_KODIK_TOKEN)',
    });
  }

  async search(query: string, filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    this.assertConfigured();
    const params: KodikQueryParams = {
      title: query,
      limit: Math.min(100, PAGE_SIZE * Math.max(page, 1)),
      anime_status: statusFilter(filters.statuses),
      year: filters.years[0],
      anime_genres: filters.genres[0],
      translation_type: filters.voiceoverKinds.includes('subtitles') ? 'subtitles' : undefined,
    };
    const response = await this.api.search(params);
    const all = response.results.map((release) => mapRelease(release, CAPABILITIES));
    const start = (Math.max(page, 1) - 1) * PAGE_SIZE;
    const items = all.slice(start, start + PAGE_SIZE);
    return { items, page, totalItems: response.total, hasMore: all.length > start + PAGE_SIZE };
  }

  async discover(_filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>> {
    this.assertConfigured();
    const requested = Math.min(100, PAGE_SIZE * Math.max(page, 1));
    const response = await this.api.list({ limit: requested, with_material_data: true });
    const all = response.results.map((release) => mapRelease(release, CAPABILITIES));
    const start = (Math.max(page, 1) - 1) * PAGE_SIZE;
    return {
      items: all.slice(start, start + PAGE_SIZE),
      page,
      totalItems: response.total,
      hasMore: all.length >= requested,
    };
  }

  async getTitle(refId: string): Promise<AnimeTitle> {
    const release = await this.api.material(refId);
    if (!release) {
      throw new AppError({ code: 'NOT_FOUND', providerId: KODIK_ID, message: `Kodik material ${refId} not found` });
    }
    return mapRelease(release, CAPABILITIES);
  }

  async getEpisodes(title: AnimeTitle): Promise<Episode[]> {
    const release = await this.api.material(title.refId, { withEpisodes: true });
    if (!release) {
      throw new AppError({ code: 'NOT_FOUND', providerId: KODIK_ID, message: `Kodik material ${title.refId} not found` });
    }
    return mapEpisodes(release);
  }

  async getAvailableVoiceovers(title: AnimeTitle): Promise<Voiceover[]> {
    const releases = await this.api.translationsFor(title.refId);
    return mapVoiceovers(releases);
  }

  async getAvailableQualities(title: AnimeTitle): Promise<QualityVariant[]> {
    const releases = await this.api.translationsFor(title.refId);
    return mapQualities(releases);
  }

  /**
   * Kodik does not publish media URLs through its documented API, so the app
   * reports the limitation instead of inventing a stream. The official embed
   * link stays available on `Episode.playerUrl`.
   */
  async getStream(): Promise<StreamBundle> {
    throw new AppError({
      code: 'STREAM_UNAVAILABLE',
      providerId: KODIK_ID,
      message: 'Kodik exposes an embed player link, not a media URL; AnimAlc does not bypass its player protection',
    });
  }

  async getGenres(): Promise<string[]> {
    this.assertConfigured();
    const response = await this.api.list({ limit: 40, with_material_data: true });
    const genres = new Set<string>();
    response.results.forEach((release: KodikRelease) => {
      (release.material_data?.genres ?? []).forEach((genre) => genres.add(genre));
    });
    return [...genres];
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    return [];
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const response = await this.api.list({ limit: 1 });
      const latencyMs = Date.now() - started;
      return {
        providerId: KODIK_ID,
        status: latencyMs > 2500 ? 'degraded' : 'healthy',
        checkedAt: Date.now(),
        latencyMs,
        details: { total: response.total, gateway: env.kodikGatewayUrl.length > 0 },
      };
    } catch (error) {
      const appError = error instanceof AppError ? error : undefined;
      return {
        providerId: KODIK_ID,
        status: 'down',
        checkedAt: Date.now(),
        latencyMs: Date.now() - started,
        errorCode: appError?.code ?? 'PROVIDER_UNAVAILABLE',
        errorMessage: appError?.message ?? 'Kodik health probe failed',
        details: { configured: this.isConfigured },
      };
    }
  }
}

export { KODIK_PROVIDER_ID };
