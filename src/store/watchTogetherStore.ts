import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';

export interface WatchTogetherHistoryEntry {
  roomId: string;
  code: string;
  joinedAt: number;
  role: 'host' | 'guest';
  titleId?: string;
}

export interface WatchTogetherState {
  sessionsCompleted: number;
  history: WatchTogetherHistoryEntry[];
  displayName?: string;
  setDisplayName: (name: string) => void;
  recordSession: (entry: WatchTogetherHistoryEntry) => void;
  resetAll: () => void;
}

const defaults: WatchTogetherState = {
  sessionsCompleted: 0,
  history: [],
  displayName: undefined,
  setDisplayName: () => undefined,
  recordSession: () => undefined,
  resetAll: () => undefined,
};

export function createWatchTogetherStore() {
  return createPersistedStore<WatchTogetherState>(defaults, {
    namespace: StorageKeys.watchTogether,
    version: 1,
    partialize: (state) => ({
      sessionsCompleted: state.sessionsCompleted,
      history: state.history.slice(-20),
      displayName: state.displayName,
    }),
  });
}

export const watchTogetherStore = createWatchTogetherStore();

export const useWatchTogetherStore = watchTogetherStore.store;

export const watchTogetherActions = {
  setDisplayName: (displayName: string) => useWatchTogetherStore.setState({ displayName }),
  recordSession: (entry: WatchTogetherHistoryEntry) =>
    useWatchTogetherStore.setState((state) => ({
      sessionsCompleted: state.sessionsCompleted + 1,
      history: [...state.history, entry].slice(-20),
    })),
  resetAll: () => watchTogetherStore.reset(),
};
