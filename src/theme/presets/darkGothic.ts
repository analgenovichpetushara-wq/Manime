import type { ThemePreset } from '@/theme/themeTypes';

/**
 * darkGothic preset. Pure configuration: adding or editing a preset never requires
 * touching a screen because every token is resolved through the theme engine.
 */
export const darkGothicPreset: ThemePreset = {
  "id": "darkGothic",
  "nameKey": "themes.darkGothic.name",
  "descriptionKey": "themes.darkGothic.description",
  "light": {
    "background": "#f4eee9",
    "backgroundAlt": "#eae1d9",
    "surface": "#fffdf9",
    "surfaceAlt": "#f6efe7",
    "card": "#fffdf9",
    "cardBorder": "#d5c4bc",
    "text": "#241a1c",
    "textMuted": "#6d5a5c",
    "textInverse": "#fffdf9",
    "primary": "#6d1424",
    "primaryText": "#fffdf9",
    "secondary": "#4a3b34",
    "accent": "#a8802a",
    "accentText": "#241a1c",
    "success": "#2c6b4a",
    "warning": "#a8802a",
    "danger": "#8f1c2c",
    "overlay": "rgba(36,26,28,0.45)",
    "gradient": [
      "#fffdf9",
      "#ece1d7"
    ],
    "navBackground": "#fffdf9",
    "navActive": "#6d1424",
    "navInactive": "#8a7772",
    "chipBackground": "#f3e9e0",
    "chipText": "#3a2a2c",
    "progressTrack": "#ded0c6",
    "progressFill": "#6d1424"
  },
  "dark": {
    "background": "#0a0507",
    "backgroundAlt": "#100a0d",
    "surface": "#150d11",
    "surfaceAlt": "#1b1116",
    "card": "#170e13",
    "cardBorder": "#37242c",
    "text": "#ece3e6",
    "textMuted": "#9c8b91",
    "textInverse": "#0a0507",
    "primary": "#8e1b2f",
    "primaryText": "#f7ece9",
    "secondary": "#6f5f66",
    "accent": "#c9a227",
    "accentText": "#150d11",
    "success": "#2f7a55",
    "warning": "#c9a227",
    "danger": "#c0283c",
    "overlay": "rgba(0,0,0,0.74)",
    "gradient": [
      "#1b1116",
      "#0a0507"
    ],
    "navBackground": "#0d0709",
    "navActive": "#c9a227",
    "navInactive": "#6a5a60",
    "chipBackground": "#241720",
    "chipText": "#e4d6da",
    "progressTrack": "#37242c",
    "progressFill": "#8e1b2f"
  },
  "typography": {
    "fontFamilyDisplay": "Georgia",
    "fontFamilyBody": "Georgia",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.6,
    "uppercaseTitles": false,
    "sizes": {
      "xs": 11,
      "sm": 13,
      "md": 15,
      "lg": 19,
      "xl": 25,
      "xxl": 31,
      "banner": 35
    },
    "lineHeightScale": 1.5
  },
  "shapes": {
    "borderStyle": "squircle",
    "radius": {
      "none": 0,
      "sm": 4,
      "md": 10,
      "lg": 18,
      "pill": 999
    },
    "borderWidth": 2,
    "elevation": 2
  },
  "presentation": {
    "cardStyle": "outlined",
    "navStyle": "tabs",
    "iconStyle": "outline",
    "pattern": "ornament",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(0,0,0,0.82)",
    "decorative": {
      "lineColor": "#c9a227",
      "glowColor": "#8e1b2f",
      "cornerStyle": "round"
    }
  }
};
