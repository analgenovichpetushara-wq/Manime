import { createProviderManager, PROVIDER_DESCRIPTORS } from '@/providers/registry';
import { CVH_ID, parseCvhReference } from '@/providers/implementations/cvh/api';
import type { ProviderManager, ManagerEvent } from '@/providers/manager';
import type {
  AnimeTitle,
  Episode,
  Paged,
  QualityVariant,
  SearchFilters,
  StreamBundle,
  Voiceover,
} from '@/data/models/anime';
import { AppError, toAppError } from '@/core/errors/AppError';
import { titleCache } from '@/services/titleCache';
import { useSettingsStore } from '@/store/settingsStore';
import { providerHealthActions } from '@/store/providerHealthStore';
import { createLogger } from '@/core/logging/logger';

const log = createLogger('provider-service');

let manager: ProviderManager | null = null;

/** Access to the shared provider manager (single instance for the whole app). */
export function getProviderManager(): ProviderManager {
  if (!manager) {
    manager = createProviderManager();
    manager.subscribe((event: ManagerEvent) => {
      if (event.type === 'health') providerHealthActions.upsert(event.health);
      if (event.type === 'titles') void titleCache.remember(event.titles);
      if (event.type === 'error') log.debug('provider error', { providerId: event.providerId, code: event.code });
    });
    manager.setDisabled(useSettingsStore.getState().disabledProviderIds);
  }
  return manager;
}

export function applySettingsToManager(): void {
  const state = useSettingsStore.getState();
  const instance = getProviderManager();
  const disabled = new Set(state.disabledProviderIds);
  for (const descriptor of PROVIDER_DESCRIPTORS) {
    if (!descriptor.enabledByDefault) {
      disabled.add(descriptor.id);
      continue;
    }
    // Credential-based sources stay off until they are configured, so the app
    // never shows a provider that can only fail.
    if (descriptor.capabilities.publicApi === false && !(descriptor.isConfigured?.() ?? false)) {
      disabled.add(descriptor.id);
    }
  }
  instance.setDisabled([...disabled]);
}

export interface SearchOutcome {
  titles: AnimeTitle[];
  failures: { providerId: string; errorCode: string }[];
  fromCache: boolean;
  usedProviders: string[];
}

function cacheKey(filters: SearchFilters, page: number): string {
  return JSON.stringify({
    q: filters.query.trim().toLowerCase(),
    g: [...filters.genres].sort(),
    y: [...filters.years].sort(),
    s: [...filters.statuses].sort(),
    p: [...filters.providerIds].sort(),
    v: [...filters.voiceoverKinds].sort(),
    m: filters.minEpisodes ?? 0,
    page,
  });
}

/**
 * Global search that merges providers, caches the merged page and degrades to
 * the cache when every provider is unreachable.
 */
export async function searchTitles(filters: SearchFilters, page = 1): Promise<SearchOutcome> {
  const instance = getProviderManager();
  const state = useSettingsStore.getState();
  const key = cacheKey(filters, page);

  /**
   * CVH is a player without a catalogue, so a pasted iframe url, numeric id or
   * `cvh:<id>` is resolved straight through its open API instead of being sent
   * to a text search that cannot answer it.
   */
  const cvhReference = page === 1 ? parseCvhReference(filters.query) : undefined;
  if (cvhReference) {
    try {
      const title = await instance.getTitle(CVH_ID, cvhReference.id);
      await titleCache.remember([title]);
      return { titles: [title], failures: [], fromCache: false, usedProviders: [CVH_ID] };
    } catch (error) {
      const appError = toAppError(error, 'PROVIDER_UNAVAILABLE');
      log.warn('cvh reference could not be resolved', { code: appError.code });
      return { titles: [], failures: [{ providerId: CVH_ID, errorCode: appError.code }], fromCache: false, usedProviders: [] };
    }
  }

  try {
    const result = await instance.search(filters, page, { preferredIds: state.providerPreferences });
    const filtered = state.matureTitlesVisible ? result.items : result.items.filter((item) => !item.isMature);
    await titleCache.rememberSearch(key, filtered);
    return { titles: filtered, failures: result.failures, fromCache: false, usedProviders: result.usedProviders };
  } catch (error) {
    const appError = toAppError(error, 'PROVIDER_UNAVAILABLE');
    log.warn('search failed, falling back to cache', { code: appError.code });
    const cached = await titleCache.getSearch(key);
    if (cached) {
      return { titles: cached, failures: [{ providerId: 'cache', errorCode: appError.code }], fromCache: true, usedProviders: [] };
    }
    throw appError;
  }
}

export async function fetchTitle(title: AnimeTitle): Promise<AnimeTitle> {
  const instance = getProviderManager();
  const cached = await titleCache.getTitle(title.id);
  try {
    const fresh = await instance.getTitle(title.providerId, title.refId, cached ?? title);
    await titleCache.rememberTitle(fresh);
    return fresh;
  } catch (error) {
    if (cached) return cached;
    throw toAppError(error, 'PROVIDER_UNAVAILABLE');
  }
}

export async function fetchEpisodes(
  title: AnimeTitle,
  preferredProviderId?: string,
): Promise<{ episodes: Episode[]; providerId: string; failures: { providerId: string; errorCode: string }[] }> {
  const instance = getProviderManager();
  const cached = await titleCache.getEpisodes(title.id);
  if (cached?.length) {
    return { episodes: cached, providerId: title.providerId, failures: [] };
  }
  const outcome = await instance.getEpisodes(title, preferredProviderId);
  if (outcome.episodes.length) await titleCache.rememberEpisodes(title.id, outcome.episodes);
  return {
    episodes: outcome.episodes,
    providerId: outcome.providerId,
    failures: outcome.failures.map((failure) => ({ providerId: failure.providerId, errorCode: failure.errorCode })),
  };
}

export async function fetchVoiceovers(title: AnimeTitle, preferredProviderId?: string): Promise<Voiceover[]> {
  const instance = getProviderManager();
  const cached = await titleCache.getVoiceovers(title.id);
  if (cached?.length) return cached;
  const outcome = await instance.getVoiceovers(title, preferredProviderId);
  if (outcome.voiceovers.length) await titleCache.rememberVoiceovers(title.id, outcome.voiceovers);
  return outcome.voiceovers;
}

export async function fetchQualities(
  title: AnimeTitle,
  episode: Episode,
  voiceoverId?: string,
): Promise<QualityVariant[]> {
  return getProviderManager().getQualities(title, episode, voiceoverId);
}

export async function fetchStream(
  title: AnimeTitle,
  episode: Episode,
  options: { qualityId?: string; voiceoverId?: string; preferredProviderId?: string } = {},
): Promise<StreamBundle> {
  const instance = getProviderManager();
  return instance.getStream(title, episode, options);
}

/** True when the providers behind a title can supply an official embed player link. */
export function supportsEmbedLink(title: AnimeTitle): boolean {
  return getProviderManager().supportsEmbedLink(title);
}

/** Official embed player link (Kodik). Never throws into the UI. */
export async function fetchEmbedLink(title: AnimeTitle): Promise<string | undefined> {
  try {
    return await getProviderManager().getEmbedLink(title);
  } catch (error) {
    log.warn('embed link unavailable', { error: String(error) });
    return undefined;
  }
}

export async function fetchGenres(): Promise<string[]> {
  try {
    return await getProviderManager().getGenres();
  } catch (error) {
    throw toAppError(error, 'PROVIDER_UNAVAILABLE');
  }
}

export async function fetchSchedule(): Promise<AnimeTitle[]> {
  try {
    const titles = await getProviderManager().getSchedule();
    await titleCache.remember(titles);
    return titles;
  } catch {
    return [];
  }
}

export async function discoverTitles(filters: SearchFilters, page = 1): Promise<Paged<AnimeTitle>> {
  const instance = getProviderManager();
  const outcome = await instance.search({ ...filters, query: '' }, page, {
    preferredIds: useSettingsStore.getState().providerPreferences,
  });
  return { items: outcome.items, page, hasMore: outcome.hasMore, totalItems: undefined };
}

export async function runHealthCheck(force = true) {
  const instance = getProviderManager();
  const results = await instance.checkHealth(undefined, force);
  providerHealthActions.upsertMany(results);
  return results;
}

export async function providerDiagnostics() {
  return getProviderManager().diagnostics();
}

export function availableProviders() {
  return PROVIDER_DESCRIPTORS;
}

export function isProviderUsable(providerId: string): boolean {
  return getProviderManager().isHealthy(providerId) && !getProviderManager().isDisabled(providerId);
}

/** Resets the singleton (tests). */
export function resetProviderManager(): void {
  manager = null;
}

export function describeError(error: unknown): { messageKey: string; detail?: string } {
  const appError = error instanceof AppError ? error : toAppError(error);
  return { messageKey: appError.messageKey, detail: appError.providerId ? `${appError.providerId}` : undefined };
}
