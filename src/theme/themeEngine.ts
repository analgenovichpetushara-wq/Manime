import { findPreset, THEME_PRESETS } from '@/theme/presets';
import type {
  ResolvedTheme,
  ThemeColors,
  ThemeEngineInput,
  ThemeMode,
  ThemePreset,
} from '@/theme/themeTypes';

const AMOLED_BACKGROUND = '#000000';
const AMOLED_BACKGROUND_ALT = '#050505';

/** Resolves a preset + user preferences into the concrete theme object. */
export function resolveTheme(input: ThemeEngineInput): ResolvedTheme {
  const preset: ThemePreset = findPreset(input.presetId);
  const mode: ThemeMode = input.mode;
  const baseColors = mode === 'dark' ? preset.dark : preset.light;
  let colors: ThemeColors = { ...baseColors };

  if (input.accentColor) {
    colors = applyAccent(colors, input.accentColor);
  }
  if (input.amoled && mode === 'dark') {
    colors = {
      ...colors,
      background: AMOLED_BACKGROUND,
      backgroundAlt: AMOLED_BACKGROUND_ALT,
      navBackground: AMOLED_BACKGROUND,
    };
  }
  if (input.override?.colors) {
    colors = { ...colors, ...stripUndefined(input.override.colors) };
  }

  const shapes = input.override?.shapes
    ? { ...preset.shapes, radius: { ...preset.shapes.radius, ...stripUndefined(input.override.shapes) } }
    : preset.shapes;

  const presentation = input.override?.presentation
    ? { ...preset.presentation, ...stripUndefined(input.override.presentation) }
    : preset.presentation;

  return {
    presetId: preset.id,
    mode,
    amoled: Boolean(input.amoled),
    colors,
    typography: preset.typography,
    shapes,
    presentation,
    accentColor: input.accentColor,
    fontScale: input.fontScale ?? 1,
    reduceMotion: input.reduceMotion ?? false,
  };
}

/** Re-derives only the accent-dependent tokens, keeping the rest of the palette. */
export function applyAccent(colors: ThemeColors, accent: string): ThemeColors {
  const onAccent = readableTextColor(accent);
  return {
    ...colors,
    primary: accent,
    primaryText: onAccent,
    accent,
    accentText: onAccent,
    navActive: accent,
    progressFill: accent,
  };
}

/** Relative luminance based contrast decision (WCAG-ish threshold). */
export function readableTextColor(background: string): string {
  const rgb = parseHexColor(background);
  if (!rgb) return '#ffffff';
  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#0b0d11';
}

export function parseHexColor(value: string): [number, number, number] | null {
  const hex = value.trim().replace('#', '');
  if (hex.length === 3) {
    const expanded = hex
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
    return parseHexColor(`#${expanded}`);
  }
  if (hex.length !== 6) return null;
  const int = Number.parseInt(hex, 16);
  if (Number.isNaN(int)) return null;
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function hexWithAlpha(value: string, alpha: number): string {
  const rgb = parseHexColor(value);
  if (!rgb) return value;
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamped})`;
}

export function scaledFontSize(base: number, fontScale: number): number {
  return Math.round(base * Math.max(0.8, Math.min(1.6, fontScale)));
}

export function listPresets(): ThemePreset[] {
  return THEME_PRESETS;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

/** Simple validation used by the customization screen and tests. */
export function isPresetId(id: string): boolean {
  return THEME_PRESETS.some((preset) => preset.id === id);
}

export function themeContrastRatio(theme: ResolvedTheme): number {
  const bg = parseHexColor(theme.colors.background);
  const fg = parseHexColor(theme.colors.text);
  if (!bg || !fg) return 0;
  const luminance = (rgb: [number, number, number]) => {
    const [r, g, b] = rgb.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(bg), luminance(fg)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
