import { MemoryStorage, readJson, setActiveStorage, storageKey, writeJson } from '@/core/storage/storage';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { WatchProgress } from '@/data/models/progress';
import {
  RETIRED_PROVIDER_IDS,
  isRetiredProviderId,
  migrateProgressEntries,
  migrateRetiredProviders,
} from '@/services/providerMigration';
import { useProgressStore } from '@/store/progressStore';

function entry(overrides: Partial<WatchProgress>): WatchProgress {
  return {
    titleId: 'kodik:serial-1',
    titleName: 'Наруто',
    providerId: 'kodik',
    episodeId: 'kodik:serial-1:s1e1',
    episodeOrdinal: 1,
    positionSec: 100,
    durationSec: 1440,
    completed: false,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('retired provider migration', () => {
  beforeEach(() => {
    setActiveStorage(new MemoryStorage());
    useProgressStore.setState({ entries: {} });
  });

  it('knows which providers were removed', () => {
    expect(RETIRED_PROVIDER_IDS).toEqual(['anilibria', 'anidub']);
    expect(isRetiredProviderId('anilibria')).toBe(true);
    expect(isRetiredProviderId('kodik')).toBe(false);
  });

  it('rebinds entries it can re-match and preserves the rest', () => {
    const entries: Record<string, WatchProgress> = {
      'anilibria:1': entry({ titleId: 'anilibria:1', titleName: 'Наруто', providerId: 'anilibria' }),
      'anidub:2': entry({ titleId: 'anidub:2', titleName: 'Блич', providerId: 'anidub', episodeOrdinal: 7 }),
      'kodik:serial-3': entry({ titleId: 'kodik:serial-3', titleName: 'Ван-Пис' }),
    };

    const { entries: migrated, report } = migrateProgressEntries(entries, (titleName) =>
      titleName === 'Наруто' ? { titleId: 'kodik:serial-42758', providerId: 'kodik', refId: 'serial-42758' } : undefined,
    );

    expect(report).toMatchObject({ scanned: 3, rebound: 1, preserved: 1, retired: ['anilibria', 'anidub'] });
    // Nothing is deleted: three entries in, three entries out.
    expect(Object.keys(migrated)).toHaveLength(3);
    expect(migrated['kodik:serial-42758']).toMatchObject({
      providerId: 'kodik',
      titleName: 'Наруто',
      episodeOrdinal: 1,
      legacyProviderId: 'anilibria',
      // Episode ids are provider specific, so the stale one is dropped.
      episodeId: '',
    });
    expect(migrated['anidub:2']).toMatchObject({ titleName: 'Блич', legacyProviderId: 'anidub', episodeOrdinal: 7 });
    expect(migrated['kodik:serial-3']).toMatchObject({ providerId: 'kodik' });
    expect(migrated['kodik:serial-3']?.legacyProviderId).toBeUndefined();
  });

  it('rewrites the persisted store once and stays a no-op afterwards', async () => {
    await writeJson(storageKey(StorageKeys.progress), {
      version: 1,
      savedAt: Date.now(),
      state: { entries: { 'anilibria:1': entry({ titleId: 'anilibria:1', providerId: 'anilibria', titleName: 'Наруто' }) } },
    });

    const report = await migrateRetiredProviders({
      searchTitle: async () => ({ titleId: 'kodik:serial-42758', providerId: 'kodik', refId: 'serial-42758' }),
    });
    expect(report).toMatchObject({ scanned: 1, rebound: 1 });
    expect(useProgressStore.getState().entries['kodik:serial-42758']?.providerId).toBe('kodik');

    const persisted = await readJson<{ state?: { entries?: Record<string, WatchProgress> } }>(
      storageKey(StorageKeys.progress),
      {},
    );
    expect(persisted.state?.entries?.['kodik:serial-42758']).toBeTruthy();

    // Second launch: the marker short-circuits the work.
    const second = await migrateRetiredProviders({
      searchTitle: async () => {
        throw new Error('must not run twice');
      },
    });
    expect(second).toMatchObject({ scanned: 0, rebound: 0 });
  });

  it('never throws into the bootstrap when storage is unusable', async () => {
    setActiveStorage({
      getItem: async () => {
        throw new Error('storage down');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    });
    await expect(migrateRetiredProviders()).resolves.toMatchObject({ scanned: 0, rebound: 0 });
  });
});
