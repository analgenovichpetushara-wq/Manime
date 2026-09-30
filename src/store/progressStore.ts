import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { CumulativeWatchStats, WatchProgress } from '@/data/models/progress';
import { emptyCumulativeStats } from '@/data/models/progress';
import { applyCompletion, computeStreak, statsWithDerived, type CompletionEvent } from '@/core/stats/watchStats';
import { dayKey } from '@/core/utils/time';

export interface ProgressState {
  entries: Record<string, WatchProgress>;
  stats: CumulativeWatchStats;
  dailyCompletions: Record<string, number>;
  activeDays: string[];
  currentStreak: number;
  longestStreak: number;
  saveProgress: (entry: WatchProgress) => void;
  completeEpisode: (entry: WatchProgress, event: CompletionEvent, titleCompletedNow: boolean) => void;
  remove: (titleId: string) => void;
  /** Recomputes derived numbers (streak, rolling windows) from stored data. */
  refreshDerived: () => void;
  resetAll: () => void;
}

const defaults: ProgressState = {
  entries: {},
  stats: emptyCumulativeStats(),
  dailyCompletions: {},
  activeDays: [],
  currentStreak: 0,
  longestStreak: 0,
  saveProgress: () => undefined,
  completeEpisode: () => undefined,
  remove: () => undefined,
  refreshDerived: () => undefined,
  resetAll: () => undefined,
};

export function createProgressStore() {
  return createPersistedStore<ProgressState>(defaults, {
    namespace: StorageKeys.progress,
    version: 1,
    partialize: (state) => ({
      entries: state.entries,
      stats: state.stats,
      dailyCompletions: state.dailyCompletions,
      activeDays: state.activeDays,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
    }),
  });
}

export const progressStore = createProgressStore();

export const useProgressStore = progressStore.store;

export const progressActions = {
  saveProgress: (entry: WatchProgress) =>
    useProgressStore.setState((state) => {
      const previous = state.entries[entry.titleId];
      const merged: WatchProgress = { ...entry, completed: entry.completed || previous?.completed === true };
      const entries = { ...state.entries, [entry.titleId]: merged };
      const stats = statsWithDerived(state.stats, entries, state.dailyCompletions);
      return { entries, stats };
    }),

  completeEpisode: (entry: WatchProgress, event: CompletionEvent, titleCompletedNow: boolean) =>
    useProgressStore.setState((state) => {
      const previous = state.entries[entry.titleId];
      const merged: WatchProgress = { ...previous, ...entry, completed: true };
      const entries = { ...state.entries, [entry.titleId]: merged };
      const day = dayKey(event.completedAt);
      const activeDays = state.activeDays.includes(day) ? state.activeDays : [...state.activeDays, day].slice(-800);
      const applied = applyCompletion(state.stats, state.dailyCompletions, event, titleCompletedNow);
      // The streak is always evaluated against the current moment: a run of days
      // stays "current" only while the latest active day is today or yesterday.
      const streak = computeStreak(activeDays);
      const stats = statsWithDerived(applied.stats, entries, applied.dailyCompletions);
      return {
        entries,
        dailyCompletions: applied.dailyCompletions,
        activeDays,
        stats,
        currentStreak: streak.current,
        longestStreak: Math.max(streak.longest, state.longestStreak),
      };
    }),

  refreshDerived: () =>
    useProgressStore.setState((state) => {
      const streak = computeStreak(state.activeDays);
      const stats = statsWithDerived(state.stats, state.entries, state.dailyCompletions);
      return { stats, currentStreak: streak.current, longestStreak: Math.max(streak.longest, state.longestStreak) };
    }),

  remove: (titleId: string) =>
    useProgressStore.setState((state) => {
      const entries = { ...state.entries };
      delete entries[titleId];
      return { entries, stats: statsWithDerived(state.stats, entries, state.dailyCompletions) };
    }),

  resetAll: () => progressStore.reset(),
};

export function continueWatchingList(state: ProgressState, limit = 12): WatchProgress[] {
  return Object.values(state.entries)
    .filter((entry) => !entry.completed && entry.positionSec > 5)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function recentlyWatchedList(state: ProgressState, limit = 12): WatchProgress[] {
  return Object.values(state.entries)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function progressFor(state: ProgressState, titleId: string): WatchProgress | undefined {
  return state.entries[titleId];
}

export function streakOf(state: ProgressState) {
  return { current: state.currentStreak, longest: state.longestStreak };
}
