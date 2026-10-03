/**
 * Anime card style presets.
 *
 * The card look is data: `PosterCard` reads these tokens instead of hardcoding
 * borders, radii or glow, so a new card style never touches a screen.
 */

export type CardStyleId =
  | 'standard'
  | 'minimal'
  | 'glass'
  | 'neon'
  | 'glitch'
  | 'manga'
  | 'vhs'
  | 'polaroid'
  | 'gothic'
  | 'cyberpunk';

export type TitlePosition = 'below' | 'overlay' | 'hidden';

export interface CardStyleTokens {
  id: CardStyleId;
  nameKey: string;
  /** Multiplier applied to the theme radius tokens. */
  radiusScale: number;
  borderWidth: number;
  /** 'theme' = cardBorder token, 'accent' = primary token, 'none' = no border. */
  borderColor: 'theme' | 'accent' | 'none';
  shadowOpacity: number;
  /** Accent-coloured glow behind the poster. */
  glowOpacity: number;
  /** Poster width/height ratio. */
  ratio: number;
  titlePosition: TitlePosition;
  showSubtitle: boolean;
  showBadge: boolean;
  showProgress: boolean;
  /** Dark gradient painted over the artwork. */
  overlayOpacity: number;
  /** Slight tilt, used by polaroid/grunge styles. */
  rotateDeg: number;
  /** Extra padding around the artwork (polaroid frame). */
  padding: number;
  /** Press feedback style. */
  press: 'fade' | 'scale' | 'none';
}

export const CARD_STYLES: CardStyleTokens[] = [
  {
    id: 'standard',
    nameKey: 'cardStyle.standard',
    radiusScale: 1,
    borderWidth: 0,
    borderColor: 'theme',
    shadowOpacity: 0.25,
    glowOpacity: 0,
    ratio: 1.48,
    titlePosition: 'below',
    showSubtitle: true,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.28,
    rotateDeg: 0,
    padding: 0,
    press: 'fade',
  },
  {
    id: 'minimal',
    nameKey: 'cardStyle.minimal',
    radiusScale: 0.5,
    borderWidth: 0,
    borderColor: 'none',
    shadowOpacity: 0,
    glowOpacity: 0,
    ratio: 1.48,
    titlePosition: 'below',
    showSubtitle: false,
    showBadge: false,
    showProgress: true,
    overlayOpacity: 0,
    rotateDeg: 0,
    padding: 0,
    press: 'fade',
  },
  {
    id: 'glass',
    nameKey: 'cardStyle.glass',
    radiusScale: 1.6,
    borderWidth: 1,
    borderColor: 'theme',
    shadowOpacity: 0.18,
    glowOpacity: 0.12,
    ratio: 1.48,
    titlePosition: 'overlay',
    showSubtitle: true,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.55,
    rotateDeg: 0,
    padding: 0,
    press: 'scale',
  },
  {
    id: 'neon',
    nameKey: 'cardStyle.neon',
    radiusScale: 1.2,
    borderWidth: 1.5,
    borderColor: 'accent',
    shadowOpacity: 0.3,
    glowOpacity: 0.45,
    ratio: 1.48,
    titlePosition: 'below',
    showSubtitle: true,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.3,
    rotateDeg: 0,
    padding: 0,
    press: 'scale',
  },
  {
    id: 'glitch',
    nameKey: 'cardStyle.glitch',
    radiusScale: 0.2,
    borderWidth: 1.5,
    borderColor: 'accent',
    shadowOpacity: 0.35,
    glowOpacity: 0.3,
    ratio: 1.42,
    titlePosition: 'overlay',
    showSubtitle: false,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.45,
    rotateDeg: 0,
    padding: 0,
    press: 'none',
  },
  {
    id: 'manga',
    nameKey: 'cardStyle.manga',
    radiusScale: 0.15,
    borderWidth: 2.5,
    borderColor: 'theme',
    shadowOpacity: 0.4,
    glowOpacity: 0,
    ratio: 1.45,
    titlePosition: 'below',
    showSubtitle: false,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.12,
    rotateDeg: 0,
    padding: 3,
    press: 'scale',
  },
  {
    id: 'vhs',
    nameKey: 'cardStyle.vhs',
    radiusScale: 0.6,
    borderWidth: 1,
    borderColor: 'theme',
    shadowOpacity: 0.3,
    glowOpacity: 0.1,
    ratio: 1.33,
    titlePosition: 'overlay',
    showSubtitle: true,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.6,
    rotateDeg: 0,
    padding: 0,
    press: 'fade',
  },
  {
    id: 'polaroid',
    nameKey: 'cardStyle.polaroid',
    radiusScale: 0.4,
    borderWidth: 0,
    borderColor: 'none',
    shadowOpacity: 0.35,
    glowOpacity: 0,
    ratio: 1.15,
    titlePosition: 'below',
    showSubtitle: false,
    showBadge: false,
    showProgress: false,
    overlayOpacity: 0.08,
    rotateDeg: -1.6,
    padding: 8,
    press: 'scale',
  },
  {
    id: 'gothic',
    nameKey: 'cardStyle.gothic',
    radiusScale: 1.1,
    borderWidth: 2,
    borderColor: 'accent',
    shadowOpacity: 0.5,
    glowOpacity: 0.2,
    ratio: 1.52,
    titlePosition: 'overlay',
    showSubtitle: false,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.68,
    rotateDeg: 0,
    padding: 4,
    press: 'fade',
  },
  {
    id: 'cyberpunk',
    nameKey: 'cardStyle.cyberpunk',
    radiusScale: 0.1,
    borderWidth: 1.5,
    borderColor: 'accent',
    shadowOpacity: 0.45,
    glowOpacity: 0.35,
    ratio: 1.44,
    titlePosition: 'overlay',
    showSubtitle: true,
    showBadge: true,
    showProgress: true,
    overlayOpacity: 0.58,
    rotateDeg: 0,
    padding: 0,
    press: 'none',
  },
];

export const DEFAULT_CARD_STYLE_ID: CardStyleId = 'standard';

export function findCardStyle(id: string): CardStyleTokens {
  return CARD_STYLES.find((style) => style.id === id) ?? CARD_STYLES[0]!;
}

export function isCardStyleId(id: string): id is CardStyleId {
  return CARD_STYLES.some((style) => style.id === id);
}
