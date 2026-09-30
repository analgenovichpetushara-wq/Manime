import { createProgressStore, progressActions, useProgressStore, continueWatchingList, recentlyWatchedList, progressFor } from '@/store/progressStore';
import { createWatchTogetherStore } from '@/store/watchTogetherStore';
import { flushAllPersistedStores, hydrateAllPersistedStores } from '@/store/persistentStore';
import type { WatchProgress } from '@/data/models/progress';
import type { CompletionEvent } from '@/core/stats/watchStats';

function entry(overrides: Partial<WatchProgress> = {}): WatchProgress {
  return {
    titleId: 'anilibria:1',
    titleName: 'Тестовый релиз',
    providerId: 'anilibria',
    episodeId: 'e1',
    episodeOrdinal: 1,
    positionSec: 120,
    durationSec: 1440,
    completed: false,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function completion(overrides: Partial<CompletionEvent> = {}): CompletionEvent {
  return {
    providerId: 'anilibria',
    voiceoverKind: 'voice',
    genres: ['Фэнтези'],
    completedAt: Date.now(),
    watchedSeconds: 1440,
    nightWatch: false,
    ...overrides,
  };
}

describe('watch progress', () => {
  beforeEach(() => {
    progressActions.resetAll();
  });

  it('stores the episode, position, provider and voiceover for continue-watching', () => {
    progressActions.saveProgress(entry({ voiceoverId: 'vo-1', qualityId: '1080' }));
    const stored = progressFor(useProgressStore.getState(), 'anilibria:1');
    expect(stored).toMatchObject({
      episodeId: 'e1',
      episodeOrdinal: 1,
      positionSec: 120,
      providerId: 'anilibria',
      voiceoverId: 'vo-1',
      qualityId: '1080',
      completed: false,
    });
  });

  it('never regresses a completed entry back to unfinished', () => {
    progressActions.saveProgress(entry({ completed: true }));
    progressActions.saveProgress(entry({ positionSec: 10, completed: false }));
    expect(progressFor(useProgressStore.getState(), 'anilibria:1')?.completed).toBe(true);
  });

  it('orders continue-watching by recency and skips finished/untouched entries', () => {
    progressActions.saveProgress(entry({ titleId: 'a', positionSec: 100, updatedAt: 1_000 }));
    progressActions.saveProgress(entry({ titleId: 'b', positionSec: 300, updatedAt: 2_000 }));
    progressActions.saveProgress(entry({ titleId: 'c', positionSec: 0, updatedAt: 3_000 }));
    progressActions.saveProgress(entry({ titleId: 'd', positionSec: 900, completed: true, updatedAt: 4_000 }));

    const list = continueWatchingList(useProgressStore.getState(), 10).map((item) => item.titleId);
    expect(list).toEqual(['b', 'a']);
    expect(recentlyWatchedList(useProgressStore.getState(), 10)[0]?.titleId).toBe('d');
  });

  it('derives statistics from real completions only', () => {
    progressActions.completeEpisode(entry({ durationSec: 1440, completed: true }), completion({ watchedSeconds: 1440 }), false);
    progressActions.completeEpisode(
      entry({ titleId: 'anilibria:2', episodeId: 'e2', durationSec: 1200, completed: true }),
      completion({ watchedSeconds: 1200, genres: ['Комедия'], providerId: 'anime365', nightWatch: true }),
      true,
    );

    const stats = useProgressStore.getState().stats;
    expect(stats.episodesCompleted).toBe(2);
    // Two distinct titles were finished, so both count as completed titles.
    expect(stats.titlesCompleted).toBe(2);
    expect(stats.secondsWatched).toBe(2640);
    expect(stats.providersUsed).toMatchObject({ anilibria: 1, anime365: 1 });
    expect(stats.genresWatched).toMatchObject({ Фэнтези: 1, Комедия: 1 });
    expect(stats.distinctProviders).toBe(2);
    expect(stats.nightEpisodes).toBe(1);
  });

  it('tracks streaks from distinct active days', () => {
    const day = 24 * 60 * 60 * 1000;
    const yesterday = new Date(Date.now() - day);
    const twoDaysAgo = new Date(Date.now() - 2 * day);
    progressActions.completeEpisode(entry({ titleId: 's1' }), completion(), false);
    progressActions.completeEpisode(entry({ titleId: 's2' }), completion({ completedAt: yesterday.getTime() }), false);
    progressActions.completeEpisode(entry({ titleId: 's3' }), completion({ completedAt: twoDaysAgo.getTime() }), false);

    const state = useProgressStore.getState();
    expect(state.currentStreak).toBeGreaterThanOrEqual(3);
    expect(state.longestStreak).toBeGreaterThanOrEqual(3);

    // Derived values stay correct after a restart.
    progressActions.refreshDerived();
    expect(useProgressStore.getState().currentStreak).toBeGreaterThanOrEqual(3);
  });

  it('removes a title from history without touching the rest', () => {
    progressActions.saveProgress(entry({ titleId: 'keep' }));
    progressActions.saveProgress(entry({ titleId: 'drop' }));
    progressActions.remove('drop');
    const state = useProgressStore.getState();
    expect(state.entries.drop).toBeUndefined();
    expect(state.entries.keep).toBeDefined();
  });

  it('survives a restart: state is flushed and rehydrated from storage', async () => {
    progressActions.saveProgress(entry({ titleId: 'restart', positionSec: 777, voiceoverId: 'vo-9' }));
    await flushAllPersistedStores();

    // Simulate a cold start: a brand new store instance reads the same storage.
    const fresh = createProgressStore();
    await fresh.hydrate();
    const restored = fresh.store.getState().entries.restart;
    expect(restored?.positionSec).toBe(777);
    expect(restored?.voiceoverId).toBe('vo-9');
  });

  it('hydrates every persisted store without throwing on an empty device', async () => {
    await expect(hydrateAllPersistedStores()).resolves.toBeUndefined();
    const sessions = createWatchTogetherStore();
    await sessions.hydrate();
    expect(sessions.store.getState().sessionsCompleted).toBe(0);
  });
});
