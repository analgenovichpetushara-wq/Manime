import type { AnimeTitle, Episode, Paged, QualityVariant, StreamBundle, Voiceover } from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';
import { probeJson } from '@/core/http/httpClient';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';

const DESCRIPTOR: ProviderDescriptor = {
  id: 'anidub',
  name: 'AniDUB / AniBoom',
  descriptionKey: 'providers.anidub.description',
  unavailableReasonKey: 'providers.anidub.requiresToken',
  capabilities: {
    search: false,
    metadata: false,
    episodes: false,
    streams: false,
    voiceovers: false,
    qualities: false,
    schedule: false,
    publicApi: false,
  },
  homepage: 'https://aniboom.one',
  enabledByDefault: false,
};

const API_BASE = 'https://aniboom.one/api/v1';

/**
 * AniDUB / AniBoom.
 *
 * Verified behaviour (see docs/PROVIDERS.md): every public endpoint answers
 * `401 Unauthorized — Provide a valid Bearer token.` A personal API token is
 * required, so this provider is registered, health-checked and reported as
 * unavailable instead of shipping a mocked implementation. When a token is
 * configured through EXPO_PUBLIC_ANIDUB_TOKEN in a self-hosted deployment the
 * provider can be enabled without touching any screen.
 */
export class AniDubProvider implements AnimeProvider {
  readonly descriptor = DESCRIPTOR;
  private readonly token: string | undefined;

  constructor(token: string | undefined = process.env.EXPO_PUBLIC_ANIDUB_TOKEN) {
    this.token = token && token.length > 0 ? token : undefined;
  }

  private unavailable(): AppError {
    return new AppError({
      code: 'PROVIDER_DISABLED',
      providerId: DESCRIPTOR.id,
      message: 'AniDUB requires a personal bearer token that is not configured',
    });
  }

  async search(): Promise<Paged<AnimeTitle>> {
    throw this.unavailable();
  }

  async discover(): Promise<Paged<AnimeTitle>> {
    throw this.unavailable();
  }

  async getTitle(): Promise<AnimeTitle> {
    throw this.unavailable();
  }

  async getEpisodes(): Promise<Episode[]> {
    throw this.unavailable();
  }

  async getAvailableVoiceovers(): Promise<Voiceover[]> {
    throw this.unavailable();
  }

  async getAvailableQualities(): Promise<QualityVariant[]> {
    throw this.unavailable();
  }

  async getStream(): Promise<StreamBundle> {
    throw this.unavailable();
  }

  async getGenres(): Promise<string[]> {
    return [];
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    return [];
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (this.token) {
      const probe = await probeJson(API_BASE, '/anime', 6000);
      return {
        providerId: DESCRIPTOR.id,
        status: probe.ok ? 'healthy' : 'down',
        checkedAt: Date.now(),
        latencyMs: probe.latencyMs,
        errorCode: probe.ok ? undefined : (probe.errorCode ?? 'HTTP_ERROR'),
        details: { authenticated: true },
      };
    }
    const probe = await probeJson(API_BASE, '/anime', 6000);
    return {
      providerId: DESCRIPTOR.id,
      status: 'disabled',
      checkedAt: Date.now(),
      latencyMs: probe.latencyMs,
      errorCode: probe.status === 401 ? 'PROVIDER_DISABLED' : (probe.errorCode ?? 'PROVIDER_DISABLED'),
      errorMessage: probe.status === 401 ? 'API requires a bearer token (verified 401)' : probe.errorMessage,
      details: { authenticated: false, httpStatus: probe.status ?? 0 },
    };
  }
}
