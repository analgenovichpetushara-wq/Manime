import type { ThemePreset } from '@/theme/themeTypes';
import { minimalistPreset } from '@/theme/presets/minimalist';
import { evangelionPreset } from '@/theme/presets/evangelion';
import { cyberpunkPreset } from '@/theme/presets/cyberpunk';
import { romancePreset } from '@/theme/presets/romance';
import { darkAcademiaPreset } from '@/theme/presets/darkAcademia';
import { retroWavePreset } from '@/theme/presets/retroWave';
import { naturePreset } from '@/theme/presets/nature';
import { tokyoGhoulPreset } from '@/theme/presets/tokyoGhoul';
import { glitchcorePreset } from '@/theme/presets/glitchcore';
import { y2kPreset } from '@/theme/presets/y2k';
import { darkGothicPreset } from '@/theme/presets/darkGothic';
import { grungePreset } from '@/theme/presets/grunge';
import { animeNeonPreset } from '@/theme/presets/animeNeon';

/**
 * All built-in customization presets. Adding a preset requires no screen
 * changes: the list below is the single registry consumed by the theme engine,
 * the customization screen and the theme preview.
 */
export const THEME_PRESETS: ThemePreset[] = [
  minimalistPreset,
  evangelionPreset,
  tokyoGhoulPreset,
  glitchcorePreset,
  cyberpunkPreset,
  y2kPreset,
  darkGothicPreset,
  grungePreset,
  animeNeonPreset,
  retroWavePreset,
  romancePreset,
  darkAcademiaPreset,
  naturePreset,
];

export const DEFAULT_PRESET_ID = 'minimalist';

export function findPreset(id: string, extras: ThemePreset[] = []): ThemePreset {
  return extras.find((preset) => preset.id === id) ?? THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0]!;
}
