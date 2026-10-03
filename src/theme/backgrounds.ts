/**
 * Background configuration model.
 *
 * Original media is never modified: a background is a *reference* to a library
 * asset (or an external URI) plus a purely visual configuration. The same
 * asset can therefore be reused by any screen with different crop, blur or
 * overlay settings, and editing a background can never touch the source file.
 */

export const BACKGROUND_SCREENS = [
  'home',
  'search',
  'details',
  'player',
  'profile',
  'settings',
  'achievements',
  'library',
  'watchTogether',
] as const;

export type BackgroundScreen = (typeof BACKGROUND_SCREENS)[number];

export type BackgroundFit = 'cover' | 'contain' | 'fill' | 'center' | 'tile';

export interface ScreenBackgroundConfig {
  /** Reference into the AnimAlc media library. */
  assetId?: string;
  /** Direct URI used when the media is not part of the library. */
  uri?: string;
  isGif?: boolean;
  fit: BackgroundFit;
  /** 1 = no zoom, >1 zooms in. The source file is never re-encoded. */
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  blur: number;
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  hue: number;
  vignette: number;
  overlayColor?: string;
  overlayOpacity: number;
  gradient: [string, string] | null;
  gradientOpacity: number;
  animated: boolean;
  parallax: boolean;
}

export function createDefaultBackground(): ScreenBackgroundConfig {
  return {
    fit: 'cover',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    blur: 0,
    opacity: 1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    grayscale: 0,
    hue: 0,
    vignette: 0,
    overlayOpacity: 0,
    gradient: null,
    gradientOpacity: 0.6,
    animated: false,
    parallax: false,
  };
}

export interface BackgroundState {
  /** One background for the whole application. */
  useEverywhere: boolean;
  global: ScreenBackgroundConfig;
  perScreen: Partial<Record<BackgroundScreen, ScreenBackgroundConfig>>;
}

export function createDefaultBackgroundState(): BackgroundState {
  return { useEverywhere: true, global: createDefaultBackground(), perScreen: {} };
}

/** Effective configuration for a screen: per-screen override wins over global. */
export function resolveBackground(state: BackgroundState, screen?: BackgroundScreen): ScreenBackgroundConfig {
  if (screen && !state.useEverywhere) {
    const override = state.perScreen[screen];
    if (override) return { ...createDefaultBackground(), ...override };
  }
  return { ...createDefaultBackground(), ...state.global };
}

export function hasImage(config: ScreenBackgroundConfig): boolean {
  return Boolean(config.assetId || config.uri);
}

const NUMBER_KEYS: (keyof ScreenBackgroundConfig)[] = [
  'zoom',
  'offsetX',
  'offsetY',
  'rotation',
  'blur',
  'opacity',
  'brightness',
  'contrast',
  'saturation',
  'grayscale',
  'hue',
  'vignette',
  'overlayOpacity',
  'gradientOpacity',
];

const FITS: BackgroundFit[] = ['cover', 'contain', 'fill', 'center', 'tile'];

/** Clamps a raw (possibly malformed) object into a safe configuration. */
export function sanitizeBackground(input: unknown): ScreenBackgroundConfig {
  const base = createDefaultBackground();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Record<string, unknown>;
  const next: ScreenBackgroundConfig = { ...base };

  if (typeof raw.assetId === 'string' && raw.assetId) next.assetId = raw.assetId;
  if (typeof raw.uri === 'string' && /^https?:\/\//i.test(raw.uri)) next.uri = raw.uri;
  if (typeof raw.isGif === 'boolean') next.isGif = raw.isGif;
  if (typeof raw.fit === 'string' && FITS.includes(raw.fit as BackgroundFit)) next.fit = raw.fit as BackgroundFit;
  if (typeof raw.overlayColor === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.overlayColor)) {
    next.overlayColor = raw.overlayColor;
  }
  if (Array.isArray(raw.gradient) && raw.gradient.length === 2 && raw.gradient.every((c) => typeof c === 'string')) {
    next.gradient = [String(raw.gradient[0]), String(raw.gradient[1])];
  }
  if (typeof raw.animated === 'boolean') next.animated = raw.animated;
  if (typeof raw.parallax === 'boolean') next.parallax = raw.parallax;

  for (const key of NUMBER_KEYS) {
    const value = Number(raw[key]);
    if (Number.isFinite(value)) (next as unknown as Record<string, number>)[key] = value;
  }

  next.zoom = clamp(next.zoom, 0.5, 6);
  next.offsetX = clamp(next.offsetX, -100, 100);
  next.offsetY = clamp(next.offsetY, -100, 100);
  next.rotation = clamp(next.rotation, -180, 180);
  next.blur = clamp(next.blur, 0, 40);
  next.opacity = clamp01(next.opacity);
  next.brightness = clamp(next.brightness, 0, 2);
  next.contrast = clamp(next.contrast, 0, 2);
  next.saturation = clamp(next.saturation, 0, 2);
  next.grayscale = clamp01(next.grayscale);
  next.hue = clamp(next.hue, -180, 180);
  next.vignette = clamp01(next.vignette);
  next.overlayOpacity = clamp01(next.overlayOpacity);
  next.gradientOpacity = clamp01(next.gradientOpacity);
  return next;
}

/** Sanitizes a whole background state document (imported JSON included). */
export function sanitizeBackgroundState(input: unknown): BackgroundState {
  const base = createDefaultBackgroundState();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Record<string, unknown>;
  const perScreen: Partial<Record<BackgroundScreen, ScreenBackgroundConfig>> = {};
  const rawPerScreen = (raw.perScreen ?? {}) as Record<string, unknown>;
  for (const screen of BACKGROUND_SCREENS) {
    if (rawPerScreen[screen]) perScreen[screen] = sanitizeBackground(rawPerScreen[screen]);
  }
  return {
    useEverywhere: typeof raw.useEverywhere === 'boolean' ? raw.useEverywhere : base.useEverywhere,
    global: sanitizeBackground(raw.global),
    perScreen,
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Maps the visual configuration to React Native image transforms/units. */
export function backgroundTransforms(config: ScreenBackgroundConfig) {
  return {
    transform: [
      { translateX: config.offsetX },
      { translateY: config.offsetY },
      { rotate: `${config.rotation}deg` },
      { scale: config.zoom },
    ] as const,
    blurRadius: Math.round(config.blur),
  };
}
