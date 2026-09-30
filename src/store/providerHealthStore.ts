import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { ProviderHealth } from '@/providers/types';

export interface ProviderHealthState {
  health: Record<string, ProviderHealth>;
  lastCheckAt: number;
  upsert: (health: ProviderHealth) => void;
  upsertMany: (list: ProviderHealth[]) => void;
  clear: () => void;
}

const defaults: ProviderHealthState = {
  health: {},
  lastCheckAt: 0,
  upsert: () => undefined,
  upsertMany: () => undefined,
  clear: () => undefined,
};

export function createProviderHealthStore() {
  return createPersistedStore<ProviderHealthState>(defaults, {
    namespace: StorageKeys.providerHealth,
    version: 1,
    partialize: (state) => ({ health: state.health, lastCheckAt: state.lastCheckAt }),
  });
}

export const providerHealthStore = createProviderHealthStore();

export const useProviderHealthStore = providerHealthStore.store;

export const providerHealthActions = {
  upsert: (health: ProviderHealth) =>
    useProviderHealthStore.setState((state) => ({
      health: { ...state.health, [health.providerId]: health },
      lastCheckAt: Date.now(),
    })),
  upsertMany: (list: ProviderHealth[]) =>
    useProviderHealthStore.setState((state) => {
      const health = { ...state.health };
      list.forEach((item) => {
        health[item.providerId] = item;
      });
      return { health, lastCheckAt: Date.now() };
    }),
  clear: () => useProviderHealthStore.setState({ health: {}, lastCheckAt: 0 }),
};
