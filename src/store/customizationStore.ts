import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import { createDefaultBackgroundState, sanitizeBackgroundState, type BackgroundScreen, type BackgroundState, type ScreenBackgroundConfig } from '@/theme/backgrounds';
import { DEFAULT_CARD_STYLE_ID, type CardStyleId } from '@/theme/cardStyles';
import { DEFAULT_NAV_STYLE_ID, type NavStyleId } from '@/theme/navStyles';
import { createDefaultEffectLevels, resolveEffects, type EffectId, type EffectLevel, type EffectLevels, type PerformanceMode, type ResolvedEffects } from '@/theme/effects';
import { createCustomTheme, customThemesToPresets, duplicateCustomTheme, type CustomTheme } from '@/theme/customThemes';

export interface AccessibilityState {
  reduceMotion: boolean;
  disableFlashing: boolean;
  highContrast: boolean;
  largerText: boolean;
  reducedTransparency: boolean;
  reducedBlur: boolean;
  simplifiedUi: boolean;
  readableText: boolean;
}

export interface CustomizationState {
  /** Effect levels chosen by the user; preset defaults fill the gaps. */
  effectLevels: EffectLevels;
  /** Global animation master switch. */
  animationsEnabled: boolean;
  cardStyleId: CardStyleId;
  navStyleId: NavStyleId;
  backgrounds: BackgroundState;
  customThemes: CustomTheme[];
  defaultCustomThemeId?: string;
  performanceMode: PerformanceMode;
  accessibility: AccessibilityState;

  setEffectLevel: (id: EffectId, level: EffectLevel) => void;
  resetEffects: () => void;
  setCardStyleId: (id: CardStyleId) => void;
  setNavStyleId: (id: NavStyleId) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  patchAccessibility: (patch: Partial<AccessibilityState>) => void;
  setBackground: (screen: BackgroundScreen | 'global', config: ScreenBackgroundConfig) => void;
  clearBackground: (screen: BackgroundScreen | 'global') => void;
  setUseEverywhere: (value: boolean) => void;
  addCustomTheme: (name: string, basePresetId: string) => string;
  updateCustomTheme: (id: string, patch: Partial<CustomTheme>) => void;
  duplicateTheme: (id: string, name?: string) => string | undefined;
  renameTheme: (id: string, name: string) => void;
  deleteTheme: (id: string) => void;
  setDefaultTheme: (id?: string) => void;
  importTheme: (theme: CustomTheme) => string;
  resetAll: () => void;
}

export function createDefaultAccessibility(): AccessibilityState {
  return {
    reduceMotion: false,
    disableFlashing: false,
    highContrast: false,
    largerText: false,
    reducedTransparency: false,
    reducedBlur: false,
    simplifiedUi: false,
    readableText: false,
  };
}

const defaults: CustomizationState = {
  effectLevels: createDefaultEffectLevels(),
  animationsEnabled: true,
  cardStyleId: DEFAULT_CARD_STYLE_ID,
  navStyleId: DEFAULT_NAV_STYLE_ID,
  backgrounds: createDefaultBackgroundState(),
  customThemes: [],
  defaultCustomThemeId: undefined,
  performanceMode: 'auto',
  accessibility: createDefaultAccessibility(),
  setEffectLevel: () => undefined,
  resetEffects: () => undefined,
  setCardStyleId: () => undefined,
  setNavStyleId: () => undefined,
  setAnimationsEnabled: () => undefined,
  setPerformanceMode: () => undefined,
  patchAccessibility: () => undefined,
  setBackground: () => undefined,
  clearBackground: () => undefined,
  setUseEverywhere: () => undefined,
  addCustomTheme: () => '',
  updateCustomTheme: () => undefined,
  duplicateTheme: () => undefined,
  renameTheme: () => undefined,
  deleteTheme: () => undefined,
  setDefaultTheme: () => undefined,
  importTheme: () => '',
  resetAll: () => undefined,
};

export function createCustomizationStore() {
  return createPersistedStore<CustomizationState>(defaults, {
    namespace: StorageKeys.customization,
    version: 1,
    partialize: (state) => ({
      effectLevels: state.effectLevels,
      animationsEnabled: state.animationsEnabled,
      cardStyleId: state.cardStyleId,
      navStyleId: state.navStyleId,
      backgrounds: state.backgrounds,
      customThemes: state.customThemes,
      defaultCustomThemeId: state.defaultCustomThemeId,
      performanceMode: state.performanceMode,
      accessibility: state.accessibility,
    }),
    migrate: (state) => {
      const raw = state as Partial<CustomizationState>;
      return {
        effectLevels: raw.effectLevels ?? createDefaultEffectLevels(),
        backgrounds: sanitizeBackgroundState(raw.backgrounds),
        accessibility: { ...createDefaultAccessibility(), ...(raw.accessibility ?? {}) },
      } as Partial<CustomizationState>;
    },
  });
}

export const customizationStore = createCustomizationStore();

export const useCustomizationStore = customizationStore.store;

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export const customizationActions = {
  setEffectLevel: (id: EffectId, level: EffectLevel) =>
    useCustomizationStore.setState((state) => ({
      effectLevels: { ...state.effectLevels, [id]: level },
    })),

  resetEffects: () => useCustomizationStore.setState({ effectLevels: createDefaultEffectLevels() }),

  setCardStyleId: (cardStyleId: CardStyleId) => useCustomizationStore.setState({ cardStyleId }),
  setNavStyleId: (navStyleId: NavStyleId) => useCustomizationStore.setState({ navStyleId }),
  setAnimationsEnabled: (animationsEnabled: boolean) => useCustomizationStore.setState({ animationsEnabled }),
  setPerformanceMode: (performanceMode: PerformanceMode) => useCustomizationStore.setState({ performanceMode }),

  patchAccessibility: (patch: Partial<AccessibilityState>) =>
    useCustomizationStore.setState((state) => ({
      accessibility: { ...state.accessibility, ...patch },
    })),

  setBackground: (screen: BackgroundScreen | 'global', config: ScreenBackgroundConfig) =>
    useCustomizationStore.setState((state) => {
      if (screen === 'global') return { backgrounds: { ...state.backgrounds, global: config } };
      return {
        backgrounds: {
          ...state.backgrounds,
          useEverywhere: false,
          perScreen: { ...state.backgrounds.perScreen, [screen]: config },
        },
      };
    }),

  clearBackground: (screen: BackgroundScreen | 'global') =>
    useCustomizationStore.setState((state) => {
      if (screen === 'global') {
        return { backgrounds: { ...state.backgrounds, global: createDefaultBackgroundState().global } };
      }
      const perScreen = { ...state.backgrounds.perScreen };
      delete perScreen[screen];
      return { backgrounds: { ...state.backgrounds, perScreen } };
    }),

  setUseEverywhere: (useEverywhere: boolean) =>
    useCustomizationStore.setState((state) => ({ backgrounds: { ...state.backgrounds, useEverywhere } })),

  addCustomTheme: (name: string, basePresetId: string): string => {
    const theme = createCustomTheme(name, basePresetId);
    useCustomizationStore.setState((state) => ({ customThemes: [...state.customThemes, theme] }));
    return theme.id;
  },

  updateCustomTheme: (id: string, patch: Partial<CustomTheme>) =>
    useCustomizationStore.setState((state) => ({
      customThemes: state.customThemes.map((theme) =>
        theme.id === id ? { ...theme, ...patch, id: theme.id, updatedAt: Date.now() } : theme,
      ),
    })),

  duplicateTheme: (id: string, name?: string): string | undefined => {
    const existing = useCustomizationStore.getState().customThemes.find((theme) => theme.id === id);
    if (!existing) return undefined;
    const copy = duplicateCustomTheme(existing, name ?? `${existing.name} copy`);
    useCustomizationStore.setState((state) => ({ customThemes: [...state.customThemes, copy] }));
    return copy.id;
  },

  renameTheme: (id: string, name: string) =>
    useCustomizationStore.setState((state) => ({
      customThemes: state.customThemes.map((theme) =>
        theme.id === id ? { ...theme, name: name.trim() || theme.name, updatedAt: Date.now() } : theme,
      ),
    })),

  deleteTheme: (id: string) =>
    useCustomizationStore.setState((state) => ({
      customThemes: state.customThemes.filter((theme) => theme.id !== id),
      defaultCustomThemeId: state.defaultCustomThemeId === id ? undefined : state.defaultCustomThemeId,
    })),

  setDefaultTheme: (id?: string) => useCustomizationStore.setState({ defaultCustomThemeId: id }),

  importTheme: (theme: CustomTheme): string => {
    const withId = { ...theme, id: newId('custom') };
    useCustomizationStore.setState((state) => ({ customThemes: [...state.customThemes, withId] }));
    return withId.id;
  },

  resetAll: () => customizationStore.reset(),
};

/** Convenience: resolves effects for the current customization state. */
export function resolveCurrentEffects(presetId: string, settingsReduceMotion = false): ResolvedEffects {
  const state = useCustomizationStore.getState();
  return resolveEffects({
    presetId,
    levels: state.effectLevels,
    performanceMode: state.performanceMode,
    accessibility: {
      reduceMotion: settingsReduceMotion || state.accessibility.reduceMotion || !state.animationsEnabled,
      disableFlashing: state.accessibility.disableFlashing,
      highContrast: state.accessibility.highContrast,
      reducedTransparency: state.accessibility.reducedTransparency,
      reducedBlur: state.accessibility.reducedBlur,
    },
  });
}

export function customizationPresets() {
  return customThemesToPresets(useCustomizationStore.getState().customThemes);
}
