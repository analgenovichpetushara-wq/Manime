import { createLogger } from '@/core/logging/logger';
import { readJson, storageKey, writeJson } from '@/core/storage/storage';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { WatchProgress } from '@/data/models/progress';
import { progressStore, useProgressStore } from '@/store/progressStore';

const log = createLogger('provider-migration');

/**
 * Providers removed during the Kodik migration. Their integrations are gone, so
 * stored references can no longer be resolved — but the user's history stays.
 */
export const RETIRED_PROVIDER_IDS: readonly string[] = ['anilibria', 'anidub'];

/** Where a retired entry can be re-attached in the new provider stack. */
export interface MigrationMatch {
  titleId: string;
  providerId: string;
  refId: string;
}

export interface RetiredProviderMigrationReport {
  scanned: number;
  rebound: number;
  preserved: number;
  retired: string[];
}

export function isRetiredProviderId(providerId: string): boolean {
  return RETIRED_PROVIDER_IDS.includes(providerId);
}

/**
 * Rewrites references to retired providers without dropping a single entry.
 *
 * Episode ids are provider specific, so a rebound entry keeps its stable
 * ordinal and drops the stale episode id; watch history, timestamps and stats
 * survive either way.
 */
export function migrateProgressEntries(
  entries: Record<string, WatchProgress>,
  resolve: (titleName: string) => MigrationMatch | undefined,
): { entries: Record<string, WatchProgress>; report: RetiredProviderMigrationReport } {
  const next: Record<string, WatchProgress> = {};
  const report: RetiredProviderMigrationReport = { scanned: 0, rebound: 0, preserved: 0, retired: [] };

  Object.values(entries).forEach((entry) => {
    report.scanned += 1;
    if (!isRetiredProviderId(entry.providerId)) {
      next[entry.titleId] = entry;
      return;
    }
    report.retired.push(entry.providerId);
    const match = resolve(entry.titleName);
    if (!match) {
      // Keep the entry untouched: history must never be deleted just because a
      // source went away. The player surfaces the usual "title unavailable"
      // error path and the user can re-add it through search.
      next[entry.titleId] = { ...entry, legacyProviderId: entry.providerId };
      report.preserved += 1;
      return;
    }
    next[match.titleId] = {
      ...entry,
      titleId: match.titleId,
      providerId: match.providerId,
      episodeId: '',
      legacyProviderId: entry.providerId,
      updatedAt: entry.updatedAt,
    };
    report.rebound += 1;
  });

  return { entries: next, report };
}

interface PersistedProgressDocument {
  version?: number;
  savedAt?: number;
  state?: { entries?: Record<string, WatchProgress> };
}

const MIGRATION_KEY = storageKey(StorageKeys.progress, 'kodik-migration');

/**
 * Runs the retired-provider migration against the persisted progress store.
 *
 * Safe to call on every launch: it is a no-op once the marker is written and it
 * never throws into the app bootstrap.
 */
export async function migrateRetiredProviders(options: {
  searchTitle?: (titleName: string) => Promise<MigrationMatch | undefined>;
  force?: boolean;
} = {}): Promise<RetiredProviderMigrationReport> {
  const empty: RetiredProviderMigrationReport = { scanned: 0, rebound: 0, preserved: 0, retired: [] };
  try {
    const marker = await readJson<{ done: boolean }>(MIGRATION_KEY, { done: false });
    if (marker.done && !options.force) return empty;

    const document = await readJson<PersistedProgressDocument>(storageKey(StorageKeys.progress), {});
    const entries = document.state?.entries ?? {};
    const hasRetired = Object.values(entries).some((entry) => isRetiredProviderId(entry.providerId));
    if (!hasRetired) {
      await writeJson(MIGRATION_KEY, { done: true, at: Date.now() });
      return { ...empty, scanned: Object.keys(entries).length };
    }

    const cache = new Map<string, MigrationMatch | undefined>();
    const resolve = (titleName: string): MigrationMatch | undefined => {
      if (cache.has(titleName)) return cache.get(titleName);
      return undefined;
    };

    // Resolve asynchronously first so the pure mapper stays synchronous.
    const names = [
      ...new Set(Object.values(entries).filter((entry) => isRetiredProviderId(entry.providerId)).map((entry) => entry.titleName)),
    ];
    for (const name of names) {
      try {
        cache.set(name, (await options.searchTitle?.(name)) ?? undefined);
      } catch (error) {
        log.warn('rematch failed', { name, error: String(error) });
        cache.set(name, undefined);
      }
    }

    const { entries: migrated, report } = migrateProgressEntries(entries, resolve);
    useProgressStore.setState({ entries: migrated });
    await progressStore.flush();
    await writeJson(MIGRATION_KEY, { done: true, at: Date.now(), ...report });
    log.info('retired provider migration finished', report);
    return report;
  } catch (error) {
    log.warn('retired provider migration failed', { error: String(error) });
    return empty;
  }
}
