import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';

export interface CvhMapping {
  cvhId: string;
  /** Where the id came from, so a wrong automatic match stays traceable. */
  origin: 'manual' | 'anilibria' | 'shikimori' | 'title';
  sourceUrl?: string;
  score?: number;
  addedAt: number;
}

export interface CvhMappingState {
  entries: Record<string, CvhMapping>;
}

const defaults: CvhMappingState = { entries: {} };

export function createCvhMappingStore() {
  return createPersistedStore<CvhMappingState>(defaults, {
    namespace: StorageKeys.cvhMappings,
    version: 1,
    partialize: (state) => ({ entries: state.entries }),
  });
}

export const cvhMappingStore = createCvhMappingStore();

export const useCvhMappingStore = cvhMappingStore.store;

export const cvhMappingActions = {
  set: (titleId: string, mapping: CvhMapping) =>
    useCvhMappingStore.setState((state) => ({ entries: { ...state.entries, [titleId]: mapping } })),
  remove: (titleId: string) =>
    useCvhMappingStore.setState((state) => {
      const entries = { ...state.entries };
      delete entries[titleId];
      return { entries };
    }),
  resetAll: () => useCvhMappingStore.setState({ entries: {} }),
};

export function readCvhMapping(titleId: string): CvhMapping | undefined {
  return useCvhMappingStore.getState().entries[titleId];
}
