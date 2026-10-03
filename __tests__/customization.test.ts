import { THEME_PRESETS, findPreset } from '@/theme/presets';
import {
  EFFECTS,
  EFFECT_LEVELS,
  PRESET_EFFECTS,
  activeEffectCount,
  activeEffects,
  hasFlashingEffects,
  performanceCap,
  resolveEffects,
} from '@/theme/effects';
import { CARD_STYLES, DEFAULT_CARD_STYLE_ID, findCardStyle } from '@/theme/cardStyles';
import { NAV_STYLES, findNavStyle } from '@/theme/navStyles';
import {
  BACKGROUND_SCREENS,
  createDefaultBackground,
  createDefaultBackgroundState,
  resolveBackground,
  sanitizeBackground,
  sanitizeBackgroundState,
} from '@/theme/backgrounds';
import {
  createCustomTheme,
  customThemeToPreset,
  duplicateCustomTheme,
  exportCustomTheme,
  importCustomTheme,
} from '@/theme/customThemes';
import { resolveTheme, isPresetId, listPresets } from '@/theme/themeEngine';
import { createCustomizationStore, customizationActions, customizationStore } from '@/store/customizationStore';

describe('visual presets', () => {
  it('ships every required preset family', () => {
    const required = [
      'minimalist',
      'evangelion',
      'tokyoGhoul',
      'glitchcore',
      'cyberpunk',
      'y2k',
      'darkGothic',
      'grunge',
      'animeNeon',
      'retroWave',
      'romance',
      'darkAcademia',
      'nature',
    ];
    for (const id of required) {
      expect(isPresetId(id)).toBe(true);
      expect(findPreset(id).id).toBe(id);
    }
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(13);
  });

  it('gives every preset a full colour palette in both modes and translatable keys', () => {
    for (const preset of THEME_PRESETS) {
      for (const palette of [preset.light, preset.dark]) {
        expect(palette.background).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.text).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.primary).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.gradient.length).toBeGreaterThanOrEqual(2);
      }
      expect(preset.nameKey).toMatch(/^themes\./);
      expect(preset.descriptionKey).toMatch(/^themes\./);
      expect(preset.presentation.cardStyle).toBeDefined();
      expect(preset.shapes.radius.md).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves a custom theme as a preset without touching built-ins', () => {
    const custom = createCustomTheme('Crimson night', 'tokyoGhoul');
    custom.colors.dark = { background: '#000000', primary: '#ff0033' };
    const preset = customThemeToPreset(custom);
    const theme = resolveTheme({ presetId: custom.id, mode: 'dark', extras: [preset] });
    expect(theme.colors.background).toBe('#000000');
    expect(theme.colors.primary).toBe('#ff0033');
    // Untouched tokens still come from the base preset.
    expect(theme.colors.text).toBe(findPreset('tokyoGhoul').dark.text);
    expect(listPresets([preset]).length).toBe(THEME_PRESETS.length + 1);
  });
});

describe('effects engine', () => {
  it('declares every required effect with adjustable intensity', () => {
    const required = [
      'crt',
      'vhs',
      'scanlines',
      'filmGrain',
      'noise',
      'rgbSplit',
      'chromaticAberration',
      'glitch',
      'pixelation',
      'blur',
      'bloom',
      'glow',
      'vignette',
      'particles',
      'floatingParticles',
      'animatedGradient',
      'distortion',
    ];
    expect(EFFECTS.map((effect) => effect.id)).toEqual(expect.arrayContaining(required));
    expect(EFFECT_LEVELS).toEqual(['off', 'low', 'medium', 'high', 'extreme']);
  });

  it('applies preset defaults and lets user levels override them', () => {
    const base = resolveEffects({ presetId: 'glitchcore' });
    expect(base.glitch.enabled).toBe(true);
    expect(base.scanlines.enabled).toBe(true);

    const off = resolveEffects({ presetId: 'glitchcore', levels: { glitch: 'off', scanlines: 'off' } });
    expect(off.glitch.enabled).toBe(false);
    expect(activeEffectCount(off)).toBeLessThan(activeEffectCount(base));
  });

  it('scales intensity monotonically with the level', () => {
    const levels = EFFECT_LEVELS.map(
      (level) => resolveEffects({ presetId: 'minimalist', performanceMode: 'high', levels: { glow: level } }).glow.intensity,
    );
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index]!).toBeGreaterThan(levels[index - 1]!);
    }
  });

  it('disables animation for Reduce Motion and flashing effects on request', () => {
    const reduced = resolveEffects({ presetId: 'glitchcore', accessibility: { reduceMotion: true } });
    expect(activeEffects(reduced).every((effect) => !effect.animated)).toBe(true);

    const noFlashing = resolveEffects({ presetId: 'glitchcore', accessibility: { disableFlashing: true } });
    expect(noFlashing.glitch.enabled).toBe(false);
    expect(hasFlashingEffects(noFlashing)).toBe(false);
  });

  it('softens overlay effects in high contrast and drops blur when reduced', () => {
    const contrast = resolveEffects({ presetId: 'grunge', levels: { noise: 'extreme' }, accessibility: { highContrast: true } });
    expect(contrast.noise.level).toBe('low');

    const noBlur = resolveEffects({ presetId: 'minimalist', levels: { blur: 'high' }, accessibility: { reducedBlur: true } });
    expect(noBlur.blur.enabled).toBe(false);
  });

  it('caps effects for the performance modes', () => {
    expect(performanceCap('high', 'extreme')).toBe('extreme');
    expect(performanceCap('balanced', 'extreme')).toBe('high');
    expect(performanceCap('battery', 'extreme')).toBe('low');
    const battery = resolveEffects({ presetId: 'animeNeon', performanceMode: 'battery' });
    expect(battery.particles.enabled).toBe(false);
  });

  it('maps every preset to effect levels that all exist', () => {
    for (const [presetId, levels] of Object.entries(PRESET_EFFECTS)) {
      expect(isPresetId(presetId)).toBe(true);
      for (const level of Object.values(levels)) {
        expect(EFFECT_LEVELS).toContain(level);
      }
    }
  });
});

describe('card and navigation styles', () => {
  it('ships the ten card styles and seven navigation styles', () => {
    expect(CARD_STYLES.map((style) => style.id)).toEqual([
      'standard',
      'minimal',
      'glass',
      'neon',
      'glitch',
      'manga',
      'vhs',
      'polaroid',
      'gothic',
      'cyberpunk',
    ]);
    expect(NAV_STYLES.map((style) => style.id)).toEqual([
      'standard',
      'floating',
      'glass',
      'neon',
      'vertical',
      'compact',
      'icons',
    ]);
    expect(findCardStyle('nope').id).toBe(DEFAULT_CARD_STYLE_ID);
    expect(findNavStyle('nope').id).toBe('standard');
    expect(findNavStyle('vertical').orientation).toBe('vertical');
  });
});

describe('backgrounds', () => {
  it('lets one screen override the global background', () => {
    const state = createDefaultBackgroundState();
    state.useEverywhere = false;
    state.perScreen.player = { ...createDefaultBackground(), assetId: 'asset_1', blur: 20 };
    expect(resolveBackground(state, 'player').assetId).toBe('asset_1');
    expect(resolveBackground(state, 'home').assetId).toBeUndefined();
  });

  it('uses the global background everywhere when that option is on', () => {
    const state = createDefaultBackgroundState();
    state.useEverywhere = true;
    state.global = { ...createDefaultBackground(), assetId: 'asset_all' };
    state.perScreen.home = { ...createDefaultBackground(), assetId: 'asset_home' };
    for (const screen of BACKGROUND_SCREENS) {
      expect(resolveBackground(state, screen).assetId).toBe('asset_all');
    }
  });

  it('clamps malformed imported configuration instead of crashing', () => {
    const sanitized = sanitizeBackground({
      fit: 'diagonal',
      zoom: 999,
      blur: -5,
      opacity: 4,
      overlayColor: 'not-a-colour',
      uri: 'javascript:alert(1)',
      gradient: ['#000000', '#ffffff'],
      parallax: 'yes',
    });
    expect(sanitized.fit).toBe('cover');
    expect(sanitized.zoom).toBe(6);
    expect(sanitized.blur).toBe(0);
    expect(sanitized.opacity).toBe(1);
    expect(sanitized.overlayColor).toBeUndefined();
    expect(sanitized.uri).toBeUndefined();
    expect(sanitized.gradient).toEqual(['#000000', '#ffffff']);
    expect(sanitized.parallax).toBe(false);
    expect(sanitizeBackgroundState('garbage').useEverywhere).toBe(true);
  });
});

describe('custom themes', () => {
  it('creates, duplicates and renames themes', () => {
    const theme = createCustomTheme('Night drive', 'cyberpunk');
    expect(theme.basePresetId).toBe('cyberpunk');
    const copy = duplicateCustomTheme(theme, 'Night drive 2');
    expect(copy.id).not.toBe(theme.id);
    expect(copy.name).toBe('Night drive 2');
    expect(copy.isDefault).toBe(false);
  });

  it('exports a compact JSON document without embedding media', () => {
    const theme = createCustomTheme('Shared', 'animeNeon');
    theme.background = { ...createDefaultBackground(), assetId: 'asset_9', blur: 8 };
    theme.colors.dark = { accent: '#ff00aa' };
    const payload = exportCustomTheme(theme);
    expect(payload).toContain('"format": "animalc-theme"');
    expect(payload).toContain('asset_9');
    expect(payload.length).toBeLessThan(2000);
  });

  it('rejects malformed imports', () => {
    expect(importCustomTheme('').ok).toBe(false);
    expect(importCustomTheme('not json').ok).toBe(false);
    expect(importCustomTheme(JSON.stringify({ hello: 'world' })).ok).toBe(false);
    expect(importCustomTheme(JSON.stringify({ format: 'animalc-theme', version: 99, theme: {} })).ok).toBe(false);
    const valid = importCustomTheme(exportCustomTheme(createCustomTheme('ok', 'grunge')));
    expect(valid.ok).toBe(true);
  });

  it('persists customization across a restart', async () => {
    await customizationStore.reset();
    customizationActions.setEffectLevel('glow', 'extreme');
    customizationActions.setCardStyleId('neon');
    customizationActions.setNavStyleId('glass');
    customizationActions.setPerformanceMode('battery');
    customizationActions.patchAccessibility({ highContrast: true });
    const themeId = customizationActions.addCustomTheme('Restart check', 'y2k');
    customizationActions.setUseEverywhere(false);
    customizationActions.setBackground('player', { ...createDefaultBackground(), blur: 12 });
    await customizationStore.flush();

    const fresh = createCustomizationStore();
    await fresh.hydrate();
    const restored = fresh.store.getState();
    expect(restored.effectLevels.glow).toBe('extreme');
    expect(restored.cardStyleId).toBe('neon');
    expect(restored.navStyleId).toBe('glass');
    expect(restored.performanceMode).toBe('battery');
    expect(restored.accessibility.highContrast).toBe(true);
    expect(restored.customThemes.some((theme) => theme.id === themeId)).toBe(true);
    expect(restored.backgrounds.useEverywhere).toBe(false);
    expect(restored.backgrounds.perScreen.player?.blur).toBe(12);
  });
});
