/**
 * User-created themes.
 *
 * A custom theme is a *diff* on top of a built-in preset: colours, typography,
 * shapes, presentation, effect levels, card style, navigation style and an
 * optional background. Exporting produces a compact JSON document — media is
 * referenced by library asset id, never embedded.
 */

import { findPreset, THEME_PRESETS } from '@/theme/presets';
import type { ThemeColors, ThemePresentation, ThemePreset, ThemeShapes, ThemeTypography } from '@/theme/themeTypes';
import type { EffectLevels } from '@/theme/effects';
import type { CardStyleId } from '@/theme/cardStyles';
import { isCardStyleId } from '@/theme/cardStyles';
import type { NavStyleId } from '@/theme/navStyles';
import { isNavStyleId } from '@/theme/navStyles';
import { sanitizeBackground, type ScreenBackgroundConfig } from '@/theme/backgrounds';

export const CUSTOM_THEME_FORMAT_VERSION = 1;

export interface CustomThemeColors {
  light?: Partial<ThemeColors>;
  dark?: Partial<ThemeColors>;
}

export interface CustomThemeShapes {
  borderStyle?: ThemeShapes['borderStyle'];
  borderWidth?: number;
  elevation?: number;
  radius?: Partial<ThemeShapes['radius']>;
}

export interface CustomTheme {
  id: string;
  name: string;
  /** Preset the theme starts from; unknown ids fall back to the default preset. */
  basePresetId: string;
  colors: CustomThemeColors;
  typography?: Partial<ThemeTypography>;
  shapes?: CustomThemeShapes;
  presentation?: Partial<ThemePresentation>;
  effects?: EffectLevels;
  cardStyleId?: CardStyleId;
  navStyleId?: NavStyleId;
  background?: ScreenBackgroundConfig;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ExportedCustomTheme {
  format: 'animalc-theme';
  version: number;
  theme: Omit<CustomTheme, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
}

export function createCustomTheme(
  name: string,
  basePresetId: string,
  now = Date.now(),
  id = `custom_${now.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
): CustomTheme {
  return {
    id,
    name: name.trim() || 'My theme',
    basePresetId: findPreset(basePresetId).id,
    colors: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateCustomTheme(theme: CustomTheme, name: string, now = Date.now()): CustomTheme {
  return {
    ...JSON.parse(JSON.stringify(theme)) as CustomTheme,
    id: `custom_${now.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: name.trim() || `${theme.name} copy`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Flattens a custom theme into a normal preset so the engine can resolve it. */
export function customThemeToPreset(theme: CustomTheme): ThemePreset {
  const base = findPreset(theme.basePresetId);
  const typography: ThemeTypography = theme.typography
    ? { ...base.typography, ...stripUndefined(theme.typography) }
    : base.typography;
  const shapes: ThemeShapes = theme.shapes
    ? {
        ...base.shapes,
        ...(theme.shapes.borderStyle ? { borderStyle: theme.shapes.borderStyle } : {}),
        ...(typeof theme.shapes.borderWidth === 'number' ? { borderWidth: theme.shapes.borderWidth } : {}),
        ...(typeof theme.shapes.elevation === 'number' ? { elevation: theme.shapes.elevation } : {}),
        radius: { ...base.shapes.radius, ...(theme.shapes.radius ?? {}) },
      }
    : base.shapes;
  const presentation: ThemePresentation = theme.presentation
    ? { ...base.presentation, ...stripUndefined(theme.presentation) }
    : base.presentation;

  return {
    ...base,
    id: theme.id,
    nameKey: theme.name,
    descriptionKey: theme.name,
    light: { ...base.light, ...(theme.colors.light ?? {}) },
    dark: { ...base.dark, ...(theme.colors.dark ?? {}) },
    typography,
    shapes,
    presentation,
  };
}

export function customThemesToPresets(themes: CustomTheme[]): ThemePreset[] {
  return themes.map(customThemeToPreset);
}

/** Serialises a theme for sharing. Media stays referenced by asset id. */
export function exportCustomTheme(theme: CustomTheme): string {
  const payload: ExportedCustomTheme = {
    format: 'animalc-theme',
    version: CUSTOM_THEME_FORMAT_VERSION,
    theme: {
      name: theme.name,
      basePresetId: theme.basePresetId,
      colors: theme.colors,
      typography: theme.typography,
      shapes: theme.shapes,
      presentation: theme.presentation,
      effects: theme.effects,
      cardStyleId: theme.cardStyleId,
      navStyleId: theme.navStyleId,
      background: theme.background ? sanitizeBackground(theme.background) : undefined,
      isDefault: false,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export type ImportResult =
  | { ok: true; theme: CustomTheme }
  | { ok: false; error: 'EMPTY' | 'NOT_JSON' | 'BAD_FORMAT' | 'NO_THEME' };

/** Validates imported JSON before it is applied. Malformed files are rejected, never applied. */
export function importCustomTheme(json: string, now = Date.now()): ImportResult {
  if (!json || !json.trim()) return { ok: false, error: 'EMPTY' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'NOT_JSON' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'NOT_JSON' };
  const document = parsed as Partial<ExportedCustomTheme>;
  if (document.format !== 'animalc-theme') return { ok: false, error: 'BAD_FORMAT' };
  if (typeof document.version !== 'number' || document.version > CUSTOM_THEME_FORMAT_VERSION) {
    return { ok: false, error: 'BAD_FORMAT' };
  }
  const raw = document.theme;
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'NO_THEME' };

  const basePresetId =
    typeof raw.basePresetId === 'string' && THEME_PRESETS.some((preset) => preset.id === raw.basePresetId)
      ? raw.basePresetId
      : THEME_PRESETS[0]!.id;

  const theme = createCustomTheme(
    typeof raw.name === 'string' ? raw.name : 'Imported theme',
    basePresetId,
    now,
  );
  theme.colors = sanitizeColors(raw.colors);
  theme.typography = raw.typography && typeof raw.typography === 'object' ? (raw.typography as Partial<ThemeTypography>) : undefined;
  theme.shapes = raw.shapes && typeof raw.shapes === 'object' ? (raw.shapes as CustomThemeShapes) : undefined;
  theme.presentation =
    raw.presentation && typeof raw.presentation === 'object' ? (raw.presentation as Partial<ThemePresentation>) : undefined;
  theme.effects = raw.effects && typeof raw.effects === 'object' ? (raw.effects as EffectLevels) : undefined;
  if (typeof raw.cardStyleId === 'string' && isCardStyleId(raw.cardStyleId)) theme.cardStyleId = raw.cardStyleId;
  if (typeof raw.navStyleId === 'string' && isNavStyleId(raw.navStyleId)) theme.navStyleId = raw.navStyleId;
  if (raw.background) theme.background = sanitizeBackground(raw.background);
  return { ok: true, theme };
}

const COLOR_KEYS: (keyof ThemeColors)[] = [
  'background',
  'backgroundAlt',
  'surface',
  'surfaceAlt',
  'card',
  'cardBorder',
  'text',
  'textMuted',
  'textInverse',
  'primary',
  'primaryText',
  'secondary',
  'accent',
  'accentText',
  'success',
  'warning',
  'danger',
  'overlay',
  'navBackground',
  'navActive',
  'navInactive',
  'chipBackground',
  'chipText',
  'progressTrack',
  'progressFill',
];

/** Drops anything that is not a colour string, so a broken import cannot poison the palette. */
export function sanitizeColors(input: unknown): CustomThemeColors {
  if (!input || typeof input !== 'object') return {};
  const raw = input as CustomThemeColors;
  const result: CustomThemeColors = {};
  for (const mode of ['light', 'dark'] as const) {
    const palette = raw[mode];
    if (!palette || typeof palette !== 'object') continue;
    const cleaned: Partial<ThemeColors> = {};
    for (const key of COLOR_KEYS) {
      const value = palette[key];
      if (typeof value === 'string' && value.trim()) {
        (cleaned as Record<string, string>)[key] = value;
      }
    }
    if (Array.isArray(palette.gradient) && palette.gradient.every((item) => typeof item === 'string')) {
      cleaned.gradient = palette.gradient;
    }
    if (Object.keys(cleaned).length) result[mode] = cleaned;
  }
  return result;
}

/** Counts the concrete overrides — powers the "x tokens customised" read-out. */
export function customThemeTokenCount(theme: CustomTheme): number {
  const colors = Object.keys(theme.colors.light ?? {}).length + Object.keys(theme.colors.dark ?? {}).length;
  const typography = theme.typography ? Object.keys(stripUndefined(theme.typography)).length : 0;
  const shapes = theme.shapes
    ? Object.keys(stripUndefined({ ...theme.shapes, radius: undefined })).length + Object.keys(theme.shapes.radius ?? {}).length
    : 0;
  const presentation = theme.presentation ? Object.keys(stripUndefined(theme.presentation)).length : 0;
  const effects = theme.effects ? Object.keys(theme.effects).length : 0;
  return colors + typography + shapes + presentation + effects + (theme.background ? 1 : 0);
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}
