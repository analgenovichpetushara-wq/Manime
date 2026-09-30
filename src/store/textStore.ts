import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { AppLanguage } from '@/data/models/settings';
import { countOverrides, setOverride, type TextOverrides } from '@/i18n/textEngine';

export interface TextState {
  overrides: TextOverrides;
  setText: (key: string, language: AppLanguage, value: string) => void;
  resetText: (key: string) => void;
  resetAll: () => void;
  import: (overrides: TextOverrides) => void;
}

const defaults: TextState = {
  overrides: {},
  setText: () => undefined,
  resetText: () => undefined,
  resetAll: () => undefined,
  import: () => undefined,
};

export function createTextStore() {
  return createPersistedStore<TextState>(defaults, {
    namespace: StorageKeys.text,
    version: 1,
    partialize: (state) => ({ overrides: state.overrides }),
  });
}

export const textStore = createTextStore();

export const useTextStore = textStore.store;

export const textActions = {
  setText: (key: string, language: AppLanguage, value: string) =>
    useTextStore.setState((state) => ({ overrides: setOverride(state.overrides, key, language, value) })),
  resetText: (key: string) =>
    useTextStore.setState((state) => {
      const next = { ...state.overrides };
      delete next[key];
      return { overrides: next };
    }),
  resetAll: () => useTextStore.setState({ overrides: {} }),
  importOverrides: (overrides: TextOverrides) => useTextStore.setState({ overrides }),
  count: () => countOverrides(useTextStore.getState().overrides),
};
