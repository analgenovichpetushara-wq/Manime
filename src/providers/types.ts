import type {
  AnimeTitle,
  Episode,
  Paged,
  ProviderCapabilities,
  QualityVariant,
  SearchFilters,
  StreamBundle,
  Voiceover,
} from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';

export type ProviderStatus = 'healthy' | 'degraded' | 'down' | 'disabled' | 'unknown';

export interface ProviderHealth {
  providerId: string;
  status: ProviderStatus;
  checkedAt: number;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  /** Non-sensitive diagnostic details shown in Settings → Providers. */
  details?: Record<string, string | number | boolean>;
}

export interface ProviderDescriptor {
  id: string;
  /** Human readable name (brand names are not translated). */
  name: string;
  /** Localisation key for the provider description. */
  descriptionKey: string;
  /** Reason a provider is wired but cannot serve data (documented, never faked). */
  unavailableReasonKey?: string;
  capabilities: ProviderCapabilities;
  homepage: string;
  enabledByDefault: boolean;
}

export interface StreamRequestOptions {
  qualityId?: string;
  voiceoverId?: string;
  headers?: Record<string, string>;
}

/**
 * Unified provider abstraction. Adding a new source means implementing this
 * interface and registering it — no screen changes are required.
 */
export interface AnimeProvider {
  readonly descriptor: ProviderDescriptor;

  search(query: string, filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>>;

  getTitle(refId: string): Promise<AnimeTitle>;

  getEpisodes(title: AnimeTitle): Promise<Episode[]>;

  getAvailableVoiceovers(title: AnimeTitle): Promise<Voiceover[]>;

  getAvailableQualities(title: AnimeTitle, episode: Episode, voiceoverId?: string): Promise<QualityVariant[]>;

  getStream(title: AnimeTitle, episode: Episode, options?: StreamRequestOptions): Promise<StreamBundle>;

  discover(filters: SearchFilters, page: number): Promise<Paged<AnimeTitle>>;

  getGenres(): Promise<string[]>;

  getSchedule(): Promise<AnimeTitle[]>;

  healthCheck(): Promise<ProviderHealth>;
}

export interface ProviderSearchFailure {
  providerId: string;
  errorCode: string;
  message: string;
}

export interface AggregatedSearchResult {
  items: AnimeTitle[];
  failures: ProviderSearchFailure[];
  page: number;
  hasMore: boolean;
  totalItems?: number;
  usedProviders: string[];
}

export function notSupported(providerId: string, capability: string): never {
  throw new AppError({
    code: 'PROVIDER_UNAVAILABLE',
    providerId,
    message: `${providerId} does not support ${capability}`,
  });
}
