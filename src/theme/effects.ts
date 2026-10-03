/**
 * Centralized effects engine.
 *
 * Every decorative effect of the application is declared here as data and
 * resolved into a runtime description (intensity, opacity, animation flags)
 * that `EffectsLayer` renders. Screens never decide which effect to draw — they
 * only ask the theme for the resolved runtime, so a new effect or a new preset
 * is a configuration change, never a screen change.
 */

export type EffectId =
  | 'crt'
  | 'vhs'
  | 'scanlines'
  | 'filmGrain'
  | 'noise'
  | 'rgbSplit'
  | 'chromaticAberration'
  | 'glitch'
  | 'pixelation'
  | 'blur'
  | 'bloom'
  | 'glow'
  | 'vignette'
  | 'particles'
  | 'floatingParticles'
  | 'animatedGradient'
  | 'distortion';

export type EffectLevel = 'off' | 'low' | 'medium' | 'high' | 'extreme';

export type PerformanceMode = 'auto' | 'high' | 'balanced' | 'battery';

export interface EffectDefinition {
  id: EffectId;
  nameKey: string;
  /** Effect moves over time; disabled automatically by Reduce Motion. */
  animated: boolean;
  /** Effect flashes; disabled automatically by "Disable flashing effects". */
  flashing: boolean;
  /** Heavy effect; dropped first by the automatic performance mode. */
  expensive: boolean;
  /** Dims the picture; softened in high-contrast mode. */
  overlay: boolean;
  defaultLevel: EffectLevel;
}

export const EFFECTS: EffectDefinition[] = [
  { id: 'crt', nameKey: 'effects.crt', animated: true, flashing: true, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'vhs', nameKey: 'effects.vhs', animated: true, flashing: true, expensive: true, overlay: true, defaultLevel: 'off' },
  { id: 'scanlines', nameKey: 'effects.scanlines', animated: false, flashing: false, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'filmGrain', nameKey: 'effects.filmGrain', animated: true, flashing: false, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'noise', nameKey: 'effects.noise', animated: false, flashing: false, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'rgbSplit', nameKey: 'effects.rgbSplit', animated: true, flashing: true, expensive: false, overlay: false, defaultLevel: 'off' },
  { id: 'chromaticAberration', nameKey: 'effects.chromaticAberration', animated: false, flashing: false, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'glitch', nameKey: 'effects.glitch', animated: true, flashing: true, expensive: true, overlay: true, defaultLevel: 'off' },
  { id: 'pixelation', nameKey: 'effects.pixelation', animated: false, flashing: false, expensive: true, overlay: false, defaultLevel: 'off' },
  { id: 'blur', nameKey: 'effects.blur', animated: false, flashing: false, expensive: true, overlay: false, defaultLevel: 'off' },
  { id: 'bloom', nameKey: 'effects.bloom', animated: false, flashing: false, expensive: true, overlay: true, defaultLevel: 'off' },
  { id: 'glow', nameKey: 'effects.glow', animated: false, flashing: false, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'vignette', nameKey: 'effects.vignette', animated: false, flashing: false, expensive: false, overlay: true, defaultLevel: 'off' },
  { id: 'particles', nameKey: 'effects.particles', animated: true, flashing: false, expensive: true, overlay: false, defaultLevel: 'off' },
  { id: 'floatingParticles', nameKey: 'effects.floatingParticles', animated: true, flashing: false, expensive: true, overlay: false, defaultLevel: 'off' },
  { id: 'animatedGradient', nameKey: 'effects.animatedGradient', animated: true, flashing: false, expensive: true, overlay: false, defaultLevel: 'off' },
  { id: 'distortion', nameKey: 'effects.distortion', animated: true, flashing: false, expensive: true, overlay: false, defaultLevel: 'off' },
];

export const EFFECT_IDS: EffectId[] = EFFECTS.map((effect) => effect.id);

export const EFFECT_LEVELS: EffectLevel[] = ['off', 'low', 'medium', 'high', 'extreme'];

/** How strongly a level pushes an effect, normalised to 0..1. */
export const LEVEL_STRENGTH: Record<EffectLevel, number> = {
  off: 0,
  low: 0.3,
  medium: 0.55,
  high: 0.8,
  extreme: 1,
};

export type EffectLevels = Partial<Record<EffectId, EffectLevel>>;

export interface EffectRuntime {
  id: EffectId;
  level: EffectLevel;
  /** 0..1 — what a renderer should multiply its maximum value by. */
  intensity: number;
  /** Convenience opacity already scaled by intensity. */
  opacity: number;
  animated: boolean;
  flashing: boolean;
  enabled: boolean;
}

export type ResolvedEffects = Record<EffectId, EffectRuntime>;

export interface EffectsAccessibility {
  reduceMotion?: boolean;
  disableFlashing?: boolean;
  highContrast?: boolean;
  reducedTransparency?: boolean;
  reducedBlur?: boolean;
}

export interface EffectsInput {
  presetId?: string;
  levels?: EffectLevels;
  accessibility?: EffectsAccessibility;
  performanceMode?: PerformanceMode;
}

/** Preset → default effect levels. Adding a preset only needs one entry here. */
export const PRESET_EFFECTS: Record<string, EffectLevels> = {
  minimalist: {},
  evangelion: { scanlines: 'low', crt: 'low', glow: 'medium', vignette: 'low' },
  tokyoGhoul: { vignette: 'medium', filmGrain: 'low', glow: 'medium', noise: 'low' },
  glitchcore: { glitch: 'medium', rgbSplit: 'medium', scanlines: 'medium', noise: 'medium', distortion: 'low' },
  cyberpunk: { scanlines: 'medium', glow: 'medium', bloom: 'low', animatedGradient: 'low' },
  y2k: { bloom: 'medium', particles: 'low', glow: 'low' },
  darkGothic: { vignette: 'medium', filmGrain: 'medium', glow: 'low' },
  grunge: { noise: 'medium', filmGrain: 'low', vignette: 'low' },
  animeNeon: { glow: 'high', bloom: 'medium', particles: 'low', animatedGradient: 'medium' },
  retroWave: { scanlines: 'medium', vhs: 'low', chromaticAberration: 'medium', animatedGradient: 'low' },
  romance: { particles: 'medium', glow: 'low' },
  darkAcademia: { filmGrain: 'medium', vignette: 'low' },
  nature: { floatingParticles: 'medium', animatedGradient: 'low' },
};

const BATTERY_DROP: EffectId[] = ['particles', 'floatingParticles', 'pixelation', 'distortion', 'animatedGradient', 'blur', 'bloom', 'vhs'];

/** Caps a level for the selected performance mode. */
export function performanceCap(mode: PerformanceMode, level: EffectLevel): EffectLevel {
  const order = EFFECT_LEVELS;
  if (mode === 'high') return level;
  const cap: EffectLevel = mode === 'battery' ? 'low' : 'high';
  return order.indexOf(level) > order.indexOf(cap) ? cap : level;
}

/** Resolves preset defaults, user overrides, accessibility and performance into runtime effects. */
export function resolveEffects(input: EffectsInput = {}): ResolvedEffects {
  const accessibility = input.accessibility ?? {};
  const performanceMode = input.performanceMode ?? 'auto';
  const presetLevels = input.presetId ? PRESET_EFFECTS[input.presetId] ?? {} : {};
  const userLevels = input.levels ?? {};

  const resolved = {} as ResolvedEffects;
  for (const definition of EFFECTS) {
    const requested = userLevels[definition.id] ?? presetLevels[definition.id] ?? definition.defaultLevel;
    let level = requested ?? 'off';
    level = performanceCap(performanceMode, level);

    if (accessibility.reducedBlur && definition.id === 'blur') level = 'off';
    if (accessibility.disableFlashing && definition.flashing) level = 'off';
    if (accessibility.highContrast && definition.overlay && EFFECT_LEVELS.indexOf(level) > EFFECT_LEVELS.indexOf('low')) {
      level = 'low';
    }
    if (performanceMode === 'battery' && BATTERY_DROP.includes(definition.id)) level = 'off';

    let intensity = LEVEL_STRENGTH[level];
    if (accessibility.reducedTransparency && (definition.id === 'bloom' || definition.id === 'glow')) intensity *= 0.5;

    resolved[definition.id] = {
      id: definition.id,
      level,
      intensity,
      opacity: intensity,
      animated: definition.animated && !accessibility.reduceMotion,
      flashing: definition.flashing,
      enabled: level !== 'off' && intensity > 0,
    };
  }
  return resolved;
}

/** Effects that should actually be drawn, strongest first. */
export function activeEffects(resolved: ResolvedEffects): EffectRuntime[] {
  return EFFECT_IDS.map((id) => resolved[id]).filter((effect) => effect?.enabled);
}

/** Number of effects the current configuration draws — used by the performance read-out. */
export function activeEffectCount(resolved: ResolvedEffects): number {
  return activeEffects(resolved).length;
}

/** True when the resolved configuration contains anything that flashes. */
export function hasFlashingEffects(resolved: ResolvedEffects): boolean {
  return activeEffects(resolved).some((effect) => effect.flashing && effect.animated);
}

export function createDefaultEffectLevels(): EffectLevels {
  return {};
}
