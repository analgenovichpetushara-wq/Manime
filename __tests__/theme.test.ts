import { resolveTheme, listPresets, applyAccent, readableTextColor, scaledFontSize, themeContrastRatio } from '@/theme/themeEngine';
import { THEME_PRESETS as PRESETS, DEFAULT_PRESET_ID } from '@/theme/presets';
import type { ThemeColors } from '@/theme/themeTypes';

const REQUIRED_TOKENS: (keyof ThemeColors)[] = [
  'background',
  'surface',
  'card',
  'cardBorder',
  'text',
  'textMuted',
  'primary',
  'primaryText',
  'accent',
  'accentText',
  'danger',
  'success',
  'navBackground',
  'navActive',
  'navInactive',
  'chipBackground',
  'progressTrack',
  'progressFill',
];

describe('theme system', () => {
  it('ships every required preset', () => {
    const ids = listPresets().map((preset) => preset.id);
    expect(ids).toEqual(
      expect.arrayContaining(['evangelion', 'cyberpunk', 'romance', 'minimalist', 'darkAcademia', 'retroWave', 'nature']),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(7);
  });

  it('defines a complete token set in both light and dark mode for every preset', () => {
    for (const preset of PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const colors = preset[mode];
        for (const token of REQUIRED_TOKENS) {
          expect(typeof colors[token]).toBe('string');
          expect((colors[token] as string).length).toBeGreaterThan(0);
        }
        expect(colors.gradient.length).toBeGreaterThanOrEqual(2);
      }
      expect(preset.nameKey).toMatch(/^themes\./);
      expect(preset.descriptionKey).toMatch(/^themes\./);
    }
  });

  it('changes typography, shapes and presentation between presets (not just colours)', () => {
    const minimalist = PRESETS.find((preset) => preset.id === 'minimalist')!;
    const cyberpunk = PRESETS.find((preset) => preset.id === 'cyberpunk')!;
    const academia = PRESETS.find((preset) => preset.id === 'darkAcademia')!;
    expect(cyberpunk.shapes.radius.md).not.toBe(minimalist.shapes.radius.md);
    expect(cyberpunk.typography.uppercaseTitles).toBe(true);
    expect(academia.typography.fontFamilyDisplay).not.toBe(minimalist.typography.fontFamilyDisplay);
    expect(new Set(PRESETS.map((preset) => preset.presentation.pattern)).size).toBeGreaterThan(3);
  });

  it('resolves a theme for the requested preset and mode', () => {
    const theme = resolveTheme({ presetId: 'evangelion', mode: 'dark' });
    expect(theme.presetId).toBe('evangelion');
    expect(theme.mode).toBe('dark');
    expect(theme.colors.background).toBe(PRESETS.find((preset) => preset.id === 'evangelion')!.dark.background);
  });

  it('falls back to the default preset when asked for an unknown one', () => {
    const theme = resolveTheme({ presetId: 'does-not-exist', mode: 'dark' });
    expect(theme.presetId).toBe(DEFAULT_PRESET_ID);
  });

  it('applies a custom accent across primary/accent tokens without breaking contrast text', () => {
    const theme = resolveTheme({ presetId: 'minimalist', mode: 'dark', accentColor: '#ff3ea5' });
    expect(theme.accentColor).toBe('#ff3ea5');
    expect(theme.colors.accent).toBe('#ff3ea5');
    const accentText = readableTextColor('#ff3ea5');
    expect(accentText).toMatch(/^#[0-9a-f]{6}$/i);
    // Light backgrounds must get dark text and vice versa.
    expect(readableTextColor('#ffffff')).not.toBe('#ffffff');
    expect(readableTextColor('#000000')).toBe('#ffffff');
  });

  it('supports AMOLED backgrounds only in dark mode', () => {
    const dark = resolveTheme({ presetId: 'minimalist', mode: 'dark', amoled: true });
    expect(dark.colors.background).toBe('#000000');
    const light = resolveTheme({ presetId: 'minimalist', mode: 'light', amoled: true });
    expect(light.colors.background).not.toBe('#000000');
  });

  it('applies colour overrides on top of the preset', () => {
    const theme = resolveTheme({ presetId: 'nature', mode: 'dark', override: { colors: { primary: '#123456' } } });
    expect(theme.colors.primary).toBe('#123456');
  });

  it('scales fonts within safe bounds', () => {
    expect(scaledFontSize(16, 1)).toBeCloseTo(16);
    expect(scaledFontSize(16, 0.2)).toBeLessThanOrEqual(16 * 0.9);
    expect(scaledFontSize(16, 5)).toBeLessThanOrEqual(Math.round(16 * 1.6));
  });

  it('keeps readable contrast between text and background', () => {
    for (const preset of PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = resolveTheme({ presetId: preset.id, mode });
        expect(themeContrastRatio(theme)).toBeGreaterThan(3);
      }
    }
  });

  it('recolours a palette without mutating the source object', () => {
    const source = { ...PRESETS[0]!.dark };
    const updated = applyAccent(source, '#22e3ff');
    expect(updated.accent).toBe('#22e3ff');
    expect(source.accent).not.toBe('#22e3ff');
  });
});
