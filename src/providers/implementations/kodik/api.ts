import { env, KODIK_DEFAULT_BASE_URL } from '@/core/config/env';
import { AppError } from '@/core/errors/AppError';
import { httpJson } from '@/core/http/httpClient';
import type {
  KodikErrorBody,
  KodikListResponse,
  KodikQueryParams,
  KodikRelease,
} from '@/providers/implementations/kodik/types';

export const KODIK_ID = 'kodik';

/** Every endpoint AnimAlc uses. Verified reachable during the migration audit. */
export const KODIK_ENDPOINTS = {
  search: '/search',
  list: '/list',
} as const;

/** Material types AnimAlc is interested in (documented Kodik values). */
export const ANIME_TYPES = ['anime', 'anime-serial'];

export interface KodikApiOptions {
  baseUrl?: string;
  /**
   * Partner token. Required when talking to Kodik directly; when AnimAlc is
   * pointed at the gateway the token stays server-side and this stays empty.
   */
  token?: string;
  timeoutMs?: number;
}

/**
 * Low-level Kodik HTTP client.
 *
 * Kodik is a credential-based API: without a partner token it answers
 * `{"error":"Отсутствует или неверный токен"}` (observed live). AnimAlc never
 * ships a token inside the mobile bundle — production points at the gateway
 * (`server/kodik-gateway.mjs`) which injects it server-side.
 */
export class KodikApi {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(options: KodikApiOptions = {}) {
    this.baseUrl = (options.baseUrl ?? env.kodikBaseUrl ?? KODIK_DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.token = options.token ?? env.kodikToken ?? '';
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  /** True when the client can authenticate (token present locally or via gateway). */
  get isConfigured(): boolean {
    return this.token.length > 0 || env.kodikGatewayUrl.length > 0 || this.baseUrl !== KODIK_DEFAULT_BASE_URL;
  }

  /** Maps a Kodik `{"error": …}` body onto a stable AppError code. */
  static classifyErrorBody(message: string): 'AUTHENTICATION_REQUIRED' | 'RATE_LIMITED' | 'NOT_FOUND' | 'INVALID_PAYLOAD' {
    const lower = message.toLowerCase();
    if (lower.includes('токен') || lower.includes('token') || lower.includes('авториз') || lower.includes('доступ')) {
      return 'AUTHENTICATION_REQUIRED';
    }
    if (lower.includes('лимит') || lower.includes('limit') || lower.includes('rate') || lower.includes('часто')) {
      return 'RATE_LIMITED';
    }
    if (lower.includes('не найден') || lower.includes('not found') || lower.includes('отсутствует материал')) {
      return 'NOT_FOUND';
    }
    return 'INVALID_PAYLOAD';
  }

  private assertConfigured(): void {
    if (this.isConfigured) return;
    throw new AppError({
      code: 'AUTHENTICATION_REQUIRED',
      providerId: KODIK_ID,
      message: 'Kodik requires a partner API token (configure the gateway or EXPO_PUBLIC_KODIK_TOKEN)',
    });
  }

  private async request<T>(path: string, params: KodikQueryParams): Promise<T> {
    this.assertConfigured();
    const query: Record<string, string | number | boolean | undefined> = { ...params };
    // The gateway injects the token; a direct call sends it as documented.
    if (this.token) query.token = this.token;

    let response;
    try {
      response = await httpJson<T | KodikErrorBody>(this.baseUrl, path, {
        query,
        providerId: KODIK_ID,
        timeoutMs: this.timeoutMs,
        attempts: 2,
      });
    } catch (error) {
      if (error instanceof AppError) {
        if (error.status === 401 || error.status === 403) {
          throw new AppError({
            code: 'AUTHENTICATION_REQUIRED',
            providerId: KODIK_ID,
            message: 'Kodik rejected the API token',
            status: error.status,
            cause: error,
          });
        }
        if (error.status === 429) {
          throw new AppError({
            code: 'RATE_LIMITED',
            providerId: KODIK_ID,
            message: 'Kodik rate limit reached',
            status: error.status,
            cause: error,
          });
        }
      }
      throw error;
    }

    const body = response.data as unknown;
    if (body && typeof body === 'object' && !Array.isArray(body) && 'error' in body) {
      const message = String((body as KodikErrorBody).error ?? 'Unknown Kodik error');
      throw new AppError({
        code: KodikApi.classifyErrorBody(message),
        providerId: KODIK_ID,
        message,
        status: response.status,
        url: response.url,
      });
    }
    if (!body || typeof body !== 'object' || !Array.isArray((body as KodikListResponse<unknown>).results)) {
      throw new AppError({
        code: 'INVALID_PAYLOAD',
        providerId: KODIK_ID,
        message: 'Kodik response is missing the results array',
        url: response.url,
      });
    }
    return body as T;
  }

  async search(params: KodikQueryParams): Promise<KodikListResponse<KodikRelease>> {
    return this.request<KodikListResponse<KodikRelease>>(KODIK_ENDPOINTS.search, {
      types: ANIME_TYPES.join(','),
      limit: 20,
      ...params,
    });
  }

  /** Catalogue listing (`/list`) used for discovery. */
  async list(params: KodikQueryParams = {}): Promise<KodikListResponse<KodikRelease>> {
    return this.request<KodikListResponse<KodikRelease>>(KODIK_ENDPOINTS.list, {
      types: ANIME_TYPES.join(','),
      limit: 20,
      sort: 'updated_at',
      order: 'desc',
      ...params,
    });
  }

  /** Single material with its episode list (embed links per season/episode). */
  async material(id: string, options: { withEpisodes?: boolean } = {}): Promise<KodikRelease | null> {
    const response = await this.search({
      id,
      limit: 100,
      with_episodes: options.withEpisodes ?? false,
      with_episodes_data: options.withEpisodes ?? false,
      with_material_data: true,
    });
    return response.results.find((release) => release.id === id) ?? response.results[0] ?? null;
  }

  /** Every translation (voiceover) Kodik lists for one material id. */
  async translationsFor(id: string): Promise<KodikRelease[]> {
    const response = await this.search({ id, limit: 100 });
    return response.results.filter((release) => release.id === id);
  }
}
