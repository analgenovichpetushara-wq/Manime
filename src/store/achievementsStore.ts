import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { AchievementState } from '@/data/models/achievements';
import { syncAchievements } from '@/features/achievements/achievementsEngine';

export interface AchievementsState {
  states: Record<string, AchievementState>;
  pendingUnlocks: string[];
  sync: (states: Record<string, AchievementState>, newlyUnlocked: string[]) => void;
  consumeUnlock: (id: string) => void;
  resetAll: () => void;
}

const defaults: AchievementsState = {
  states: {},
  pendingUnlocks: [],
  sync: () => undefined,
  consumeUnlock: () => undefined,
  resetAll: () => undefined,
};

export function createAchievementsStore() {
  return createPersistedStore<AchievementsState>(defaults, {
    namespace: StorageKeys.achievements,
    version: 1,
    partialize: (state) => ({ states: state.states }),
  });
}

export const achievementsStore = createAchievementsStore();

export const useAchievementsStore = achievementsStore.store;

export const achievementActions = {
  /** Applies a recalculated snapshot, queueing toast notifications for new unlocks. */
  sync: (context: Parameters<typeof syncAchievements>[1], previous?: Record<string, AchievementState>) =>
    useAchievementsStore.setState((state) => {
      const base = previous ?? state.states;
      const result = syncAchievements(base, context);
      return {
        states: result.states,
        pendingUnlocks: [...state.pendingUnlocks, ...result.newlyUnlocked.map((item) => item.id)],
      };
    }),
  consumeUnlock: (id: string) =>
    useAchievementsStore.setState((state) => ({
      pendingUnlocks: state.pendingUnlocks.filter((item) => item !== id),
    })),
  resetAll: () => achievementsStore.reset(),
};
