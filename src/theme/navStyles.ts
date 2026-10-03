/**
 * Navigation style presets consumed by the shared tab bar.
 * Like every other visual layer, these are data — the navigator only reads tokens.
 */

export type NavStyleId = 'standard' | 'floating' | 'glass' | 'neon' | 'vertical' | 'compact' | 'icons';

export type NavIndicator = 'none' | 'dot' | 'pill' | 'underline';

export interface NavStyleTokens {
  id: NavStyleId;
  nameKey: string;
  height: number;
  showLabels: boolean;
  /** Detached bar with side margins and rounded corners. */
  floating: boolean;
  cornerRadius: number;
  margin: number;
  /** Translucent bar; the app adds a blur layer behind it. */
  translucent: boolean;
  backgroundOpacity: number;
  borderWidth: number;
  borderColorMode: 'theme' | 'accent' | 'none';
  indicator: NavIndicator;
  iconSize: number;
  orientation: 'horizontal' | 'vertical';
  /** Accent glow behind the active item. */
  glowOpacity: number;
  animateIndicator: boolean;
}

export const NAV_STYLES: NavStyleTokens[] = [
  {
    id: 'standard',
    nameKey: 'navStyle.standard',
    height: 62,
    showLabels: true,
    floating: false,
    cornerRadius: 0,
    margin: 0,
    translucent: false,
    backgroundOpacity: 1,
    borderWidth: 1,
    borderColorMode: 'theme',
    indicator: 'underline',
    iconSize: 22,
    orientation: 'horizontal',
    glowOpacity: 0,
    animateIndicator: true,
  },
  {
    id: 'floating',
    nameKey: 'navStyle.floating',
    height: 66,
    showLabels: true,
    floating: true,
    cornerRadius: 26,
    margin: 14,
    translucent: false,
    backgroundOpacity: 1,
    borderWidth: 1,
    borderColorMode: 'theme',
    indicator: 'pill',
    iconSize: 22,
    orientation: 'horizontal',
    glowOpacity: 0.12,
    animateIndicator: true,
  },
  {
    id: 'glass',
    nameKey: 'navStyle.glass',
    height: 64,
    showLabels: true,
    floating: true,
    cornerRadius: 22,
    margin: 12,
    translucent: true,
    backgroundOpacity: 0.55,
    borderWidth: 1,
    borderColorMode: 'theme',
    indicator: 'dot',
    iconSize: 22,
    orientation: 'horizontal',
    glowOpacity: 0.1,
    animateIndicator: true,
  },
  {
    id: 'neon',
    nameKey: 'navStyle.neon',
    height: 64,
    showLabels: true,
    floating: true,
    cornerRadius: 18,
    margin: 12,
    translucent: false,
    backgroundOpacity: 0.92,
    borderWidth: 1.5,
    borderColorMode: 'accent',
    indicator: 'pill',
    iconSize: 23,
    orientation: 'horizontal',
    glowOpacity: 0.45,
    animateIndicator: true,
  },
  {
    id: 'vertical',
    nameKey: 'navStyle.vertical',
    height: 0,
    showLabels: false,
    floating: true,
    cornerRadius: 24,
    margin: 12,
    translucent: false,
    backgroundOpacity: 1,
    borderWidth: 1,
    borderColorMode: 'theme',
    indicator: 'pill',
    iconSize: 24,
    orientation: 'vertical',
    glowOpacity: 0.18,
    animateIndicator: true,
  },
  {
    id: 'compact',
    nameKey: 'navStyle.compact',
    height: 52,
    showLabels: true,
    floating: false,
    cornerRadius: 0,
    margin: 0,
    translucent: false,
    backgroundOpacity: 1,
    borderWidth: 1,
    borderColorMode: 'theme',
    indicator: 'dot',
    iconSize: 19,
    orientation: 'horizontal',
    glowOpacity: 0,
    animateIndicator: false,
  },
  {
    id: 'icons',
    nameKey: 'navStyle.icons',
    height: 58,
    showLabels: false,
    floating: true,
    cornerRadius: 999,
    margin: 16,
    translucent: true,
    backgroundOpacity: 0.7,
    borderWidth: 1,
    borderColorMode: 'theme',
    indicator: 'dot',
    iconSize: 26,
    orientation: 'horizontal',
    glowOpacity: 0.2,
    animateIndicator: true,
  },
];

export const DEFAULT_NAV_STYLE_ID: NavStyleId = 'standard';

export function findNavStyle(id: string): NavStyleTokens {
  return NAV_STYLES.find((style) => style.id === id) ?? NAV_STYLES[0]!;
}

export function isNavStyleId(id: string): id is NavStyleId {
  return NAV_STYLES.some((style) => style.id === id);
}
