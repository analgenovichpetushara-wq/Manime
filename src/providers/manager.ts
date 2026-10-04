import type {
  AnimeTitle,
  Episode,
  Paged,
  QualityVariant,
  SearchFilters,
  StreamBundle,
  Voiceover,
} from '@/data/models/anime';
import { EMPTY_FILTERS } from '@/data/models/anime';
import { AppError, toAppError } from '@/core/errors/AppError';
import { createLogger } from '@/core/logging/logger';
import { mapLimit } from '@/core/utils/async';
import { mergeTitleEntries } from '@/providers/merge/mergeTitles';
import { classifyHealth, createHealthRecord, isUsable, statusPriority, type HealthRecord } from '@/providers/health';
import type {
  AggregatedSearchResult,
  AnimeProvider,
  ProviderHealth,
  ProviderSearchFailure,
  StreamRequestOptions,
} from '@/providers/types';

const log = createLogger('provider-manager');

export interface ProviderManagerOptions {
  /** Health results are reused for this long before probing again. */
  healthTtlMs?: number;
  /** Max concurrent provider calls. */
  concurrency?: number;
  /** Hook receiving aggregated catalogue results for cache + persistence. */
  onTitlesResolved?: (titles: AnimeTitle[]) => void;
}

export type ManagerEvent =
  | { type: 'health'; health: ProviderHealth }
  | { type: 'titles'; titles: AnimeTitle[] }
  | { type: 'error'; providerId: string; code: string };

/**
 * Central registry + orchestrator for every anime source.
 * Screens only ever talk to this class, never to a concrete provider.
 */
export class ProviderManager {
  private readonly providers = new Map<string, AnimeProvider>();
  private readonly health = new Map<string, HealthRecord>();
  private readonly listeners = new Set<(event: ManagerEvent) => void>();
  private readonly disabled = new Set<string>();
  private readonly options: Required<Pick<ProviderManagerOptions, 'healthTtlMs' | 'concurrency'>> &
    Pick<ProviderManagerOptions, 'onTitlesResolved'>;

  constructor(options: ProviderManagerOptions = {}) {
    this.options = {
      healthTtlMs: options.healthTtlMs ?? 120_000,
      concurrency: options.concurrency ?? 4,
      onTitlesResolved: options.onTitlesResolved,
    };
  }

  register(provider: AnimeProvider): void {
    this.providers.set(provider.descriptor.id, provider);
    if (!this.health.has(provider.descriptor.id)) {
      this.health.set(provider.descriptor.id, createHealthRecord(provider.descriptor.id));
    }
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
    this.health.delete(providerId);
  }

  list(): AnimeProvider[] {
    return [...this.providers.values()];
  }

  get(providerId: string): AnimeProvider | undefined {
    return this.providers.get(providerId);
  }

  require(providerId: string): AnimeProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new AppError({ code: 'PROVIDER_UNAVAILABLE', providerId, message: `provider ${providerId} is not registered` });
    }
    return provider;
  }

  setDisabled(providerIds: string[]): void {
    this.disabled.clear();
    providerIds.forEach((id) => this.disabled.add(id));
  }

  isDisabled(providerId: string): boolean {
    return this.disabled.has(providerId);
  }

  subscribe(listener: (event: ManagerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        log.warn('listener failed', { error: String(error) });
      }
    }
  }

  getHealth(providerId?: string): ProviderHealth[] {
    if (providerId) {
      const record = this.health.get(providerId);
      return record ? [record] : [];
    }
    return [...this.health.values()];
  }

  isHealthy(providerId: string): boolean {
    const record = this.health.get(providerId);
    if (!record) return true;
    return isUsable(record.status);
  }

  /** Providers ordered by health, user preference and streaming capability. */
  getOrderedProviders(options: { requireStreams?: boolean; preferredIds?: string[] } = {}): AnimeProvider[] {
    const preferred = options.preferredIds ?? [];
    return this.list()
      .filter((provider) => !this.disabled.has(provider.descriptor.id))
      .filter((provider) => (options.requireStreams ? provider.descriptor.capabilities.streams : true))
      .sort((a, b) => {
        const aPref = preferred.indexOf(a.descriptor.id);
        const bPref = preferred.indexOf(b.descriptor.id);
        if (aPref !== bPref) return (aPref === -1 ? 99 : aPref) - (bPref === -1 ? 99 : bPref);
        const aHealth = this.health.get(a.descriptor.id);
        const bHealth = this.health.get(b.descriptor.id);
        const priority = statusPriority(aHealth?.status ?? 'unknown') - statusPriority(bHealth?.status ?? 'unknown');
        if (priority !== 0) return priority;
        if (aHealth?.latencyMs && bHealth?.latencyMs) return aHealth.latencyMs - bHealth.latencyMs;
        return 0;
      });
  }

  /** Runs health checks for every provider (or the given subset) with caching. */
  async checkHealth(providerIds?: string[], force = false): Promise<ProviderHealth[]> {
    const targets = (providerIds ? providerIds.map((id) => this.providers.get(id)) : this.list()).filter(
      (provider): provider is AnimeProvider => !!provider,
    );
    const results = await mapLimit(targets, this.options.concurrency, async (provider) => {
      const id = provider.descriptor.id;
      const previous = this.health.get(id) ?? createHealthRecord(id);
      const fresh = !force && previous.checkedAt > 0 && Date.now() - previous.checkedAt < this.options.healthTtlMs;
      if (fresh) return previous;
      try {
        const probe = await provider.healthCheck();
        const record: HealthRecord = {
          ...previous,
          ...probe,
          consecutiveFailures: probe.status === 'down' ? previous.consecutiveFailures + 1 : 0,
          consecutiveSuccesses: probe.status === 'healthy' ? previous.consecutiveSuccesses + 1 : 0,
        };
        this.health.set(id, record);
        this.emit({ type: 'health', health: record });
        return record;
      } catch (error) {
        const appError = toAppError(error, 'PROVIDER_UNAVAILABLE');
        const record = classifyHealth(
          { ok: false, latencyMs: 0, errorCode: appError.code, errorMessage: appError.message, status: appError.status },
          previous,
        );
        this.health.set(id, record);
        this.emit({ type: 'health', health: record });
        return record;
      }
    });
    return results;
  }

  private recordFailure(providerId: string, error: unknown): ProviderSearchFailure {
    const appError = toAppError(error, 'PROVIDER_UNAVAILABLE');
    const previous = this.health.get(providerId) ?? createHealthRecord(providerId);
    const record = classifyHealth(
      { ok: false, latencyMs: 0, errorCode: appError.code, errorMessage: appError.message, status: appError.status },
      previous,
    );
    this.health.set(providerId, record);
    this.emit({ type: 'health', health: record });
    this.emit({ type: 'error', providerId, code: appError.code });
    log.warn('provider call failed', { providerId, code: appError.code });
    return { providerId, errorCode: appError.code, message: appError.message };
  }

  private recordSuccess(providerId: string, latencyMs: number): void {
    const previous = this.health.get(providerId) ?? createHealthRecord(providerId);
    const record: HealthRecord = {
      ...previous,
      status: latencyMs > 2500 ? 'degraded' : 'healthy',
      checkedAt: Date.now(),
      latencyMs,
      consecutiveFailures: 0,
      consecutiveSuccesses: previous.consecutiveSuccesses + 1,
      errorCode: undefined,
      errorMessage: undefined,
    };
    this.health.set(providerId, record);
    this.emit({ type: 'health', health: record });
  }

  /** Global search: queries every capable provider in parallel and merges the results. */
  async search(filters: SearchFilters, page = 1, options: { preferredIds?: string[] } = {}): Promise<AggregatedSearchResult> {
    const query = filters.query.trim();
    const candidates = this.getOrderedProviders({ preferredIds: options.preferredIds }).filter(
      (provider) =>
        provider.descriptor.capabilities.search &&
        (filters.providerIds.length === 0 || filters.providerIds.includes(provider.descriptor.id)),
    );
    const failures: ProviderSearchFailure[] = [];
    const collected: AnimeTitle[] = [];
    const usedProviders: string[] = [];

    await mapLimit(candidates, this.options.concurrency, async (provider) => {
      const started = Date.now();
      try {
        const result: Paged<AnimeTitle> = query
          ? await provider.search(query, filters, page)
          : await provider.discover(filters, page);
        this.recordSuccess(provider.descriptor.id, Date.now() - started);
        if (result.items.length) usedProviders.push(provider.descriptor.id);
        collected.push(...result.items);
      } catch (error) {
        failures.push(this.recordFailure(provider.descriptor.id, error));
      }
    });

    const streamCapable = this.list()
      .filter((provider) => provider.descriptor.capabilities.streams)
      .map((provider) => provider.descriptor.id);
    const merged = mergeTitleEntries(collected, streamCapable);
    const filtered = this.applyFilters(merged, filters);
    this.options.onTitlesResolved?.(filtered);
    this.emit({ type: 'titles', titles: filtered });

    return {
      items: filtered,
      failures,
      page,
      hasMore: failures.length < candidates.length,
      usedProviders,
    };
  }

  private applyFilters(titles: AnimeTitle[], filters: SearchFilters): AnimeTitle[] {
    return titles.filter((title) => {
      if (filters.genres.length) {
        const lower = title.genres.map((genre) => genre.toLowerCase());
        if (!filters.genres.some((genre) => lower.includes(genre.toLowerCase()))) return false;
      }
      if (filters.years.length && (!title.year || !filters.years.includes(title.year))) return false;
      if (filters.statuses.length && !filters.statuses.includes(title.status)) return false;
      if (filters.minEpisodes && (title.episodesTotal ?? 0) < filters.minEpisodes) return false;
      if (filters.providerIds.length && !title.providerRefs.some((ref) => filters.providerIds.includes(ref.providerId))) {
        return false;
      }
      return true;
    });
  }

  /** Resolves a title through its own provider, with graceful degradation. */
  async getTitle(providerId: string, refId: string, cacheHint?: AnimeTitle): Promise<AnimeTitle> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      if (cacheHint) return cacheHint;
      throw new AppError({ code: 'PROVIDER_UNAVAILABLE', providerId, message: `unknown provider ${providerId}` });
    }
    if (!provider.descriptor.capabilities.metadata) {
      if (cacheHint) return cacheHint;
      throw new AppError({ code: 'PROVIDER_UNAVAILABLE', providerId, message: `${providerId} has no metadata` });
    }
    try {
      const result = await provider.getTitle(refId);
      this.recordSuccess(providerId, 0);
      return result;
    } catch (error) {
      if (cacheHint) {
        this.recordFailure(providerId, error);
        return cacheHint;
      }
      throw toAppError(error, 'PROVIDER_UNAVAILABLE');
    }
  }

  /** Episode list with fallback to metadata-only providers. */
  async getEpisodes(title: AnimeTitle, preferredProviderId?: string): Promise<{ episodes: Episode[]; providerId: string; failures: ProviderSearchFailure[] }> {
    const failures: ProviderSearchFailure[] = [];
    const candidates = this.orderedRefsFor(title, preferredProviderId).filter(
      (provider) => provider.descriptor.capabilities.episodes,
    );
    for (const provider of candidates) {
      const ref = title.providerRefs.find((candidate) => candidate.providerId === provider.descriptor.id);
      if (!ref) continue;
      try {
        const episodes = await provider.getEpisodes(title);
        if (episodes.length) return { episodes, providerId: provider.descriptor.id, failures };
        failures.push({ providerId: provider.descriptor.id, errorCode: 'MISSING_EPISODE', message: 'empty episode list' });
        const record = this.health.get(provider.descriptor.id) ?? createHealthRecord(provider.descriptor.id);
        this.health.set(
          provider.descriptor.id,
          classifyHealth({ ok: false, latencyMs: 0, errorCode: 'MISSING_EPISODE' }, record),
        );
      } catch (error) {
        failures.push(this.recordFailure(provider.descriptor.id, error));
      }
    }
    if (candidates.length === 0) {
      failures.push({ providerId: title.providerId, errorCode: 'PROVIDER_UNAVAILABLE', message: 'no provider exposes episodes' });
    }
    return { episodes: [], providerId: title.providerId, failures };
  }

  async getVoiceovers(title: AnimeTitle, preferredProviderId?: string): Promise<{ voiceovers: Voiceover[]; failures: ProviderSearchFailure[] }> {
    const failures: ProviderSearchFailure[] = [];
    const aggregate: Voiceover[] = [];
    const candidates = this.orderedRefsFor(title, preferredProviderId).filter(
      (provider) => provider.descriptor.capabilities.voiceovers,
    );
    await mapLimit(candidates, this.options.concurrency, async (provider) => {
      try {
        const list = await provider.getAvailableVoiceovers(title);
        aggregate.push(...list);
      } catch (error) {
        failures.push(this.recordFailure(provider.descriptor.id, error));
      }
    });
    const seen = new Set<string>();
    const unique = aggregate.filter((voiceover) => {
      const key = `${voiceover.providerId}:${voiceover.refId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { voiceovers: unique, failures };
  }

  async getQualities(title: AnimeTitle, episode: Episode, voiceoverId?: string): Promise<QualityVariant[]> {
    const provider = this.providerForEpisode(title, episode, voiceoverId);
    if (!provider) return [];
    try {
      return await provider.getAvailableQualities(title, episode, voiceoverId);
    } catch (error) {
      this.recordFailure(provider.descriptor.id, error);
      return [];
    }
  }

  /**
   * Stream resolution with provider fallback: if the primary source fails the
   * manager walks the remaining providers that expose the same title.
   */
  async getStream(
    title: AnimeTitle,
    episode: Episode,
    options: StreamRequestOptions & { preferredProviderId?: string } = {},
  ): Promise<StreamBundle> {
    const failures: string[] = [];
    const candidates = this.orderedRefsFor(title, options.preferredProviderId).filter(
      (provider) => provider.descriptor.capabilities.streams,
    );
    for (const provider of candidates) {
      if (!this.isHealthy(provider.descriptor.id)) continue;
      try {
        const bundle = await provider.getStream(title, episode, options);
        if (bundle.sources.length) return bundle;
        failures.push(`${provider.descriptor.id}: no sources`);
      } catch (error) {
        const appError = toAppError(error, 'STREAM_UNAVAILABLE');
        failures.push(`${provider.descriptor.id}: ${appError.code}`);
        this.recordFailure(provider.descriptor.id, error);
      }
    }
    throw new AppError({
      code: 'STREAM_UNAVAILABLE',
      providerId: options.preferredProviderId ?? title.providerId,
      message: failures.length ? `no stream available (${failures.join(', ')})` : 'no streaming provider for this title',
    });
  }

  /**
   * True when this title can be played inside a provider's own player.
   *
   * Two honest cases: a source that publishes no media URL at all (Kodik) always
   * plays through its embed player, and a source that normally streams (AniLibria)
   * offers one only for the releases where it published an `external_player`
   * link — so the check follows the title, not the provider, and the button is
   * never shown for a title that has nothing to open.
   */
  supportsEmbedLink(title: AnimeTitle, preferredProviderId?: string): boolean {
    if (title.externalPlayerUrl) return true;
    return this.orderedRefsFor(title, preferredProviderId).some(
      (provider) => typeof provider.getEmbedLink === 'function' && provider.descriptor.capabilities.streams === false,
    );
  }

  /** Official embed player link for a title, from the first provider that has one. */
  async getEmbedLink(title: AnimeTitle, preferredProviderId?: string): Promise<string | undefined> {
    const candidates = this.orderedRefsFor(title, preferredProviderId).filter(
      (provider) => typeof provider.getEmbedLink === 'function',
    );
    for (const provider of candidates) {
      try {
        const link = await provider.getEmbedLink?.(title);
        if (link) return link;
      } catch (error) {
        this.recordFailure(provider.descriptor.id, error);
      }
    }
    return undefined;
  }

  async getGenres(): Promise<string[]> {
    const aggregate = new Set<string>();
    await mapLimit(this.list(), this.options.concurrency, async (provider) => {
      try {
        const genres = await provider.getGenres();
        genres.forEach((genre) => aggregate.add(genre));
      } catch (error) {
        this.recordFailure(provider.descriptor.id, error);
      }
    });
    return [...aggregate].sort((a, b) => a.localeCompare(b, 'ru'));
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    const collected: AnimeTitle[] = [];
    await mapLimit(this.list(), this.options.concurrency, async (provider) => {
      if (!provider.descriptor.capabilities.schedule) return;
      try {
        collected.push(...(await provider.getSchedule()));
      } catch (error) {
        this.recordFailure(provider.descriptor.id, error);
      }
    });
    const streamCapable = this.list()
      .filter((provider) => provider.descriptor.capabilities.streams)
      .map((provider) => provider.descriptor.id);
    return mergeTitleEntries(collected, streamCapable).slice(0, 30);
  }

  /** Providers that expose this title, ordered for playback (streams first). */
  orderedRefsFor(title: AnimeTitle, preferredProviderId?: string): AnimeProvider[] {
    const refs = title.providerRefs.length
      ? title.providerRefs
      : [{ providerId: title.providerId, refId: title.refId }];
    const providers: AnimeProvider[] = [];
    for (const ref of refs) {
      const provider = this.providers.get(ref.providerId);
      if (provider && !this.disabled.has(provider.descriptor.id) && !providers.includes(provider)) {
        providers.push(provider);
      }
    }
    return providers.sort((a, b) => {
      if (preferredProviderId) {
        if (a.descriptor.id === preferredProviderId) return -1;
        if (b.descriptor.id === preferredProviderId) return 1;
      }
      const aStreams = a.descriptor.capabilities.streams ? 0 : 1;
      const bStreams = b.descriptor.capabilities.streams ? 0 : 1;
      if (aStreams !== bStreams) return aStreams - bStreams;
      return statusPriority(this.health.get(a.descriptor.id)?.status ?? 'unknown') -
        statusPriority(this.health.get(b.descriptor.id)?.status ?? 'unknown');
    });
  }

  private providerForEpisode(title: AnimeTitle, episode: Episode, voiceoverId?: string): AnimeProvider | undefined {
    const episodeProvider = this.providers.get(episode.providerId);
    if (episodeProvider && !this.disabled.has(episode.providerId)) return episodeProvider;
    if (voiceoverId) {
      const voiceoverProviderId = voiceoverId.split(':')[0];
      const voiceProvider = voiceoverProviderId ? this.providers.get(voiceoverProviderId) : undefined;
      if (voiceProvider) return voiceProvider;
    }
    const streamCapable = this.orderedRefsFor(title).find((provider) => provider.descriptor.capabilities.streams);
    return streamCapable;
  }

  /** Diagnostics for Settings → Providers screen. */
  async diagnostics(): Promise<{ providerId: string; name: string; health: ProviderHealth; capabilities: string[] }[]> {
    const health = await this.checkHealth();
    return this.list().map((provider) => {
      const record = health.find((item) => item.providerId === provider.descriptor.id) ?? this.health.get(provider.descriptor.id);
      const capabilities = Object.entries(provider.descriptor.capabilities)
        .filter(([, value]) => value === true)
        .map(([key]) => key);
      return {
        providerId: provider.descriptor.id,
        name: provider.descriptor.name,
        health:
          record ??
          ({
            providerId: provider.descriptor.id,
            status: 'unknown',
            checkedAt: 0,
          } as ProviderHealth),
        capabilities,
      };
    });
  }
}

export const defaultSearchFilters = (): SearchFilters => ({ ...EMPTY_FILTERS });
