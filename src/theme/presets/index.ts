import type { ThemePreset } from '@/theme/themeTypes';
import { minimalistPreset } from '@/theme/presets/minimalist';
import { evangelionPreset } from '@/theme/presets/evangelion';
import { cyberpunkPreset } from '@/theme/presets/cyberpunk';
import { romancePreset } from '@/theme/presets/romance';
import { darkAcademiaPreset } from '@/theme/presets/darkAcademia';
import { retroWavePreset } from '@/theme/presets/retroWave';
import { naturePreset } from '@/theme/presets/nature';

/** All built-in customization presets. Adding a preset requires no screen changes. */
export const THEME_PRESETS: ThemePreset[] = [
  minimalistPreset,
  evangelionPreset,
  cyberpunkPreset,
  romancePreset,
  darkAcademiaPreset,
  retroWavePreset,
  naturePreset,
];

export const DEFAULT_PRESET_ID = 'minimalist';

export function findPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0]!;
}
