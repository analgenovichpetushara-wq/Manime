import { createPersistedStore } from '@/store/persistentStore';
import { createDefaultSettings, type AppSettings, type AppLanguage } from '@/data/models/settings';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { ThemeMode } from '@/theme/themeTypes';

export interface SettingsState extends AppSettings {
  hydrated: boolean;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setMode: (mode: ThemeMode) => void;
  toggleAmoled: () => void;
  setLanguage: (language: AppLanguage) => void;
  setAccent: (accent?: string) => void;
  setThemePreset: (presetId: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  setProviderPreferenceOrder: (ids: string[]) => void;
  toggleProviderDisabled: (providerId: string) => void;
  setDisabledProviders: (ids: string[]) => void;
  resetSettings: () => void;
}

const defaults: SettingsState = {
  ...createDefaultSettings(),
  hydrated: false,
  setSetting: () => undefined,
  setMode: () => undefined,
  toggleAmoled: () => undefined,
  setLanguage: () => undefined,
  setAccent: () => undefined,
  setThemePreset: () => undefined,
  setPlaybackSpeed: () => undefined,
  setProviderPreferenceOrder: () => undefined,
  toggleProviderDisabled: () => undefined,
  setDisabledProviders: () => undefined,
  resetSettings: () => undefined,
};

export function createSettingsStore() {
  return createPersistedStore<SettingsState>(defaults, {
    namespace: StorageKeys.settings,
    version: 1,
    partialize: (state) => {
      const { hydrated: _hydrated, ...rest } = state;
      const persistable = { ...rest } as Record<string, unknown>;
      for (const [key, value] of Object.entries(persistable)) {
        if (typeof value === 'function') delete persistable[key];
      }
      return persistable as Partial<SettingsState>;
    },
    migrate: (state) => ({ ...createDefaultSettings(), ...(state as Partial<AppSettings>) } as Partial<SettingsState>),
  });
}

export const settingsStore = createSettingsStore();

export const useSettingsStore = settingsStore.store;

export const settingsActions = {
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    useSettingsStore.setState({ [key]: value } as unknown as Partial<SettingsState>),
  setMode: (mode: ThemeMode) => useSettingsStore.setState({ mode }),
  toggleAmoled: () => useSettingsStore.setState((state) => ({ amoled: !state.amoled })),
  setLanguage: (language: AppLanguage) => useSettingsStore.setState({ language }),
  setAccent: (accentColor?: string) => useSettingsStore.setState({ accentColor }),
  setThemePreset: (themePresetId: string) => useSettingsStore.setState({ themePresetId }),
  setPlaybackSpeed: (playbackSpeed: number) => useSettingsStore.setState({ playbackSpeed }),
  setProviderPreferenceOrder: (providerPreferences: string[]) => useSettingsStore.setState({ providerPreferences }),
  toggleProviderDisabled: (providerId: string) =>
    useSettingsStore.setState((state) => ({
      disabledProviderIds: state.disabledProviderIds.includes(providerId)
        ? state.disabledProviderIds.filter((id) => id !== providerId)
        : [...state.disabledProviderIds, providerId],
    })),
  setDisabledProviders: (disabledProviderIds: string[]) => useSettingsStore.setState({ disabledProviderIds }),
};
