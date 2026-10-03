export type ThemeMode = 'light' | 'dark';

export type CardStyle = 'flat' | 'elevated' | 'outlined';
export type NavStyle = 'tabs' | 'pill' | 'underline';
export type IconStyle = 'outline' | 'filled';
export type BorderStyle = 'rounded' | 'sharp' | 'squircle';

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryText: string;
  secondary: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  gradient: string[];
  navBackground: string;
  navActive: string;
  navInactive: string;
  chipBackground: string;
  chipText: string;
  progressTrack: string;
  progressFill: string;
}

export interface ThemeTypography {
  fontFamilyDisplay: string;
  fontFamilyBody: string;
  fontFamilyMono: string;
  letterSpacing: number;
  uppercaseTitles: boolean;
  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    banner: number;
  };
  lineHeightScale: number;
}

export interface ThemeShapes {
  borderStyle: BorderStyle;
  radius: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  borderWidth: number;
  elevation: number;
}

export interface ThemePresentation {
  cardStyle: CardStyle;
  navStyle: NavStyle;
  iconStyle: IconStyle;
  pattern: string;
  showGridMotif: boolean;
  headlineTransform: 'none' | 'uppercase';
  dimBackground: string;
  decorative?: {
    /** Accent used for technical/geometric decorations (Evangelion, Cyberpunk). */
    lineColor?: string;
    glowColor?: string;
    cornerStyle?: 'square' | 'cut' | 'round';
  };
}

export interface ThemePreset {
  id: string;
  nameKey: string;
  descriptionKey: string;
  light: ThemeColors;
  dark: ThemeColors;
  typography: ThemeTypography;
  shapes: ThemeShapes;
  presentation: ThemePresentation;
}

export interface ResolvedTheme {
  presetId: string;
  mode: ThemeMode;
  amoled: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  shapes: ThemeShapes;
  presentation: ThemePresentation;
  accentColor?: string;
  fontScale: number;
  reduceMotion: boolean;
}

export interface ThemeOverride {
  colors?: Partial<ThemeColors>;
  shapes?: Partial<ThemeShapes['radius']>;
  presentation?: Partial<ThemePresentation>;
}

export interface ThemeEngineInput {
  presetId: string;
  /** Additional presets (user-created themes) resolved before the built-ins. */
  extras?: ThemePreset[];
  mode: ThemeMode;
  amoled?: boolean;
  accentColor?: string;
  fontScale?: number;
  reduceMotion?: boolean;
  override?: ThemeOverride;
}
