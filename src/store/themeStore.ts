import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { ThemeOverride } from '@/theme/themeTypes';
import { DEFAULT_PRESET_ID } from '@/theme/presets';

export interface ThemeState {
  /** Preset chosen separately from settings so customization survives resets. */
  presetId: string;
  override: ThemeOverride;
  appliedPresets: string[];
  setPresetId: (presetId: string) => void;
  setOverride: (override: ThemeOverride) => void;
  patchOverride: (patch: ThemeOverride) => void;
  resetOverride: () => void;
}

const defaults: ThemeState = {
  presetId: DEFAULT_PRESET_ID,
  override: {},
  appliedPresets: [DEFAULT_PRESET_ID],
  setPresetId: () => undefined,
  setOverride: () => undefined,
  patchOverride: () => undefined,
  resetOverride: () => undefined,
};

export function createThemeStore() {
  return createPersistedStore<ThemeState>(defaults, {
    namespace: StorageKeys.theme,
    version: 1,
    partialize: (state) => ({ presetId: state.presetId, override: state.override, appliedPresets: state.appliedPresets }),
  });
}

export const themeStore = createThemeStore();

export const useThemeStore = themeStore.store;

export const themeActions = {
  setPresetId: (presetId: string) =>
    useThemeStore.setState((state) => ({
      presetId,
      appliedPresets: state.appliedPresets.includes(presetId)
        ? state.appliedPresets
        : [...state.appliedPresets, presetId],
    })),
  setOverride: (override: ThemeOverride) => useThemeStore.setState({ override }),
  patchOverride: (patch: ThemeOverride) =>
    useThemeStore.setState((state) => ({
      override: {
        colors: { ...state.override.colors, ...patch.colors },
        presentation: { ...state.override.presentation, ...patch.presentation },
        shapes: { ...state.override.shapes, ...patch.shapes },
      },
    })),
  resetOverride: () => useThemeStore.setState({ override: {} }),
};
