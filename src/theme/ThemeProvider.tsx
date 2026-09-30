import React, { createContext, useContext, useMemo } from 'react';
import type { ResolvedTheme } from '@/theme/themeTypes';
import { resolveTheme } from '@/theme/themeEngine';
import { createDefaultSettings, type AppSettings } from '@/data/models/settings';
import { DEFAULT_PRESET_ID } from '@/theme/presets';

export interface ThemeContextValue {
  theme: ResolvedTheme;
  settings: Pick<AppSettings, 'mode' | 'amoled' | 'accentColor' | 'fontScale' | 'reduceMotion'>;
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
  children,
}: {
  presetId?: string;
  mode?: ResolvedTheme['mode'];
  amoled?: boolean;
  accentColor?: string;
  fontScale?: number;
  reduceMotion?: boolean;
  override?: Parameters<typeof resolveTheme>[0]['override'];
  children: React.ReactNode;
}) {
  const defaults = createDefaultSettings();
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
      }),
    [presetId, mode, amoled, accentColor, fontScale, reduceMotion, override, defaults.mode],
  );

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
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const fallbackTheme = resolveTheme({ presetId: DEFAULT_PRESET_ID, mode: 'dark' });

export function useTheme(): ResolvedTheme {
  return useContext(ThemeContext)?.theme ?? fallbackTheme;
}

export function useThemeValue(): ThemeContextValue {
  return useContext(ThemeContext) ?? { theme: fallbackTheme, settings: { mode: 'dark', amoled: false, accentColor: undefined, fontScale: 1, reduceMotion: false } };
}
