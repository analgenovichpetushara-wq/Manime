import type { ThemePreset } from '@/theme/themeTypes';

/**
 * minimalist preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const minimalistPreset: ThemePreset = {
  "id": "minimalist",
  "nameKey": "themes.minimalist.name",
  "descriptionKey": "themes.minimalist.description",
  "light": {
    "background": "#f6f7f9",
    "backgroundAlt": "#eceef2",
    "surface": "#ffffff",
    "surfaceAlt": "#f1f3f6",
    "card": "#ffffff",
    "cardBorder": "#e2e5ea",
    "text": "#12141a",
    "textMuted": "#68707d",
    "textInverse": "#ffffff",
    "primary": "#3f5bd9",
    "primaryText": "#ffffff",
    "secondary": "#7c8aa5",
    "accent": "#3f5bd9",
    "accentText": "#ffffff",
    "success": "#2f9e63",
    "warning": "#d1892a",
    "danger": "#d0463b",
    "overlay": "rgba(15,17,22,0.45)",
    "gradient": [
      "#ffffff",
      "#eef1f6"
    ],
    "navBackground": "#ffffff",
    "navActive": "#3f5bd9",
    "navInactive": "#8b93a1",
    "chipBackground": "#eef0f4",
    "chipText": "#2a2f38",
    "progressTrack": "#e3e6ec",
    "progressFill": "#3f5bd9"
  },
  "dark": {
    "background": "#0e1013",
    "backgroundAlt": "#14171c",
    "surface": "#181c22",
    "surfaceAlt": "#1d222a",
    "card": "#1a1f26",
    "cardBorder": "#262c35",
    "text": "#f2f4f8",
    "textMuted": "#98a1af",
    "textInverse": "#0e1013",
    "primary": "#7f96ff",
    "primaryText": "#0b0d11",
    "secondary": "#8592a8",
    "accent": "#7f96ff",
    "accentText": "#0b0d11",
    "success": "#4fc48a",
    "warning": "#e0a34e",
    "danger": "#f0685c",
    "overlay": "rgba(0,0,0,0.55)",
    "gradient": [
      "#181c22",
      "#0e1013"
    ],
    "navBackground": "#12151a",
    "navActive": "#7f96ff",
    "navInactive": "#7d8798",
    "chipBackground": "#222831",
    "chipText": "#d7dde7",
    "progressTrack": "#262c35",
    "progressFill": "#7f96ff"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0,
    "uppercaseTitles": false,
    "sizes": {
      "xs": 11,
      "sm": 13,
      "md": 15,
      "lg": 18,
      "xl": 24,
      "xxl": 30,
      "banner": 34
    },
    "lineHeightScale": 1.35
  },
  "shapes": {
    "borderStyle": "rounded",
    "radius": {
      "none": 0,
      "sm": 8,
      "md": 14,
      "lg": 22,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 2
  },
  "presentation": {
    "cardStyle": "flat",
    "navStyle": "tabs",
    "iconStyle": "outline",
    "pattern": "none",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(0,0,0,0.4)"
  }
};
