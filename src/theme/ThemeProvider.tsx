import React, { createContext, useContext, useMemo } from 'react';
import type { ResolvedTheme } from '@/theme/themeTypes';
import { resolveTheme } from '@/theme/themeEngine';
import { createDefaultSettings, type AppSettings } from '@/data/models/settings';
import { DEFAULT_PRESET_ID } from '@/theme/presets';
import { customThemesToPresets, type CustomTheme } from '@/theme/customThemes';
import { resolveEffects, type ResolvedEffects } from '@/theme/effects';
import { findCardStyle, type CardStyleTokens } from '@/theme/cardStyles';
import { findNavStyle, type NavStyleTokens } from '@/theme/navStyles';
import { createDefaultBackgroundState, resolveBackground, type BackgroundScreen, type BackgroundState, type ScreenBackgroundConfig } from '@/theme/backgrounds';

export interface ThemeCustomization {
  /** User-created themes; they resolve before the built-in presets. */
  customThemes?: CustomTheme[];
  /** Pre-resolved effects. When omitted the provider resolves preset defaults. */
  effects?: ResolvedEffects;
  cardStyleId?: string;
  navStyleId?: string;
  backgrounds?: BackgroundState;
}

export interface ThemeContextValue {
  theme: ResolvedTheme;
  settings: Pick<AppSettings, 'mode' | 'amoled' | 'accentColor' | 'fontScale' | 'reduceMotion'>;
  effects: ResolvedEffects;
  cardStyle: CardStyleTokens;
  navStyle: NavStyleTokens;
  backgrounds: BackgroundState;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  presetId,
  mode,
  amoled,
  accentColor,
  fontScale,
  reduceMotion,
  override,
  customization,
  children,
}: {
  presetId?: string;
  mode?: ResolvedTheme['mode'];
  amoled?: boolean;
  accentColor?: string;
  fontScale?: number;
  reduceMotion?: boolean;
  override?: Parameters<typeof resolveTheme>[0]['override'];
  customization?: ThemeCustomization;
  children: React.ReactNode;
}) {
  const defaults = createDefaultSettings();
  const customThemes = customization?.customThemes;
  const effects = customization?.effects;
  const cardStyleId = customization?.cardStyleId;
  const navStyleId = customization?.navStyleId;
  const backgrounds = customization?.backgrounds;

  const extras = useMemo(() => customThemesToPresets(customThemes ?? []), [customThemes]);

  const theme = useMemo(
    () =>
      resolveTheme({
        presetId: presetId ?? DEFAULT_PRESET_ID,
        mode: mode ?? defaults.mode,
        amoled,
        accentColor,
        fontScale,
        reduceMotion,
        override,
        extras,
      }),
    [presetId, mode, amoled, accentColor, fontScale, reduceMotion, override, defaults.mode, extras],
  );

  const resolvedEffects = useMemo(
    () =>
      effects ??
      resolveEffects({
        presetId: theme.presetId,
        accessibility: { reduceMotion: theme.reduceMotion },
      }),
    [effects, theme.presetId, theme.reduceMotion],
  );

  const cardStyle = useMemo(() => findCardStyle(cardStyleId ?? ''), [cardStyleId]);
  const navStyle = useMemo(() => findNavStyle(navStyleId ?? ''), [navStyleId]);
  const backgroundState = useMemo(() => backgrounds ?? createDefaultBackgroundState(), [backgrounds]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      settings: {
        mode: theme.mode,
        amoled: theme.amoled,
        accentColor: theme.accentColor,
        fontScale: theme.fontScale,
        reduceMotion: theme.reduceMotion,
      },
      effects: resolvedEffects,
      cardStyle,
      navStyle,
      backgrounds: backgroundState,
    }),
    [theme, resolvedEffects, cardStyle, navStyle, backgroundState],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const fallbackTheme = resolveTheme({ presetId: DEFAULT_PRESET_ID, mode: 'dark' });
const fallbackEffects = resolveEffects({ presetId: DEFAULT_PRESET_ID });

export function useTheme(): ResolvedTheme {
  return useContext(ThemeContext)?.theme ?? fallbackTheme;
}

export function useThemeValue(): ThemeContextValue {
  return (
    useContext(ThemeContext) ?? {
      theme: fallbackTheme,
      settings: { mode: 'dark', amoled: false, accentColor: undefined, fontScale: 1, reduceMotion: false },
      effects: fallbackEffects,
      cardStyle: findCardStyle(''),
      navStyle: findNavStyle(''),
      backgrounds: createDefaultBackgroundState(),
    }
  );
}

/** Resolved effect runtime — consumed by EffectsLayer, never by individual screens. */
export function useEffects(): ResolvedEffects {
  return useThemeValue().effects;
}

export function useCardStyle(): CardStyleTokens {
  return useThemeValue().cardStyle;
}

export function useNavStyle(): NavStyleTokens {
  return useThemeValue().navStyle;
}

/** Background configuration for one screen (per-screen override wins). */
export function useScreenBackground(screen?: BackgroundScreen): ScreenBackgroundConfig {
  const { backgrounds } = useThemeValue();
  return useMemo(() => resolveBackground(backgrounds, screen), [backgrounds, screen]);
}
