import type { ThemePreset } from '@/theme/themeTypes';

/**
 * romance preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const romancePreset: ThemePreset = {
  "id": "romance",
  "nameKey": "themes.romance.name",
  "descriptionKey": "themes.romance.description",
  "light": {
    "background": "#fff6fa",
    "backgroundAlt": "#fdeaf3",
    "surface": "#ffffff",
    "surfaceAlt": "#fff1f7",
    "card": "#ffffff",
    "cardBorder": "#f6d6e5",
    "text": "#3a2b33",
    "textMuted": "#8d7480",
    "textInverse": "#ffffff",
    "primary": "#f0699e",
    "primaryText": "#ffffff",
    "secondary": "#b79df0",
    "accent": "#ffa8c5",
    "accentText": "#4a1a2c",
    "success": "#5cc08d",
    "warning": "#e2a65a",
    "danger": "#e2617f",
    "overlay": "rgba(74,26,44,0.35)",
    "gradient": [
      "#fff6fa",
      "#f3e4ff"
    ],
    "navBackground": "#ffffff",
    "navActive": "#f0699e",
    "navInactive": "#c2a7b4",
    "chipBackground": "#fdeef5",
    "chipText": "#5a3746",
    "progressTrack": "#f7dbe8",
    "progressFill": "#f0699e"
  },
  "dark": {
    "background": "#1b1218",
    "backgroundAlt": "#221721",
    "surface": "#241821",
    "surfaceAlt": "#2b1d28",
    "card": "#26191f",
    "cardBorder": "#3c2733",
    "text": "#fdeef4",
    "textMuted": "#bb9aa9",
    "textInverse": "#1b1218",
    "primary": "#ff8fb6",
    "primaryText": "#33101e",
    "secondary": "#c3a8ff",
    "accent": "#ffb7cf",
    "accentText": "#33101e",
    "success": "#6fd3a4",
    "warning": "#f0bd77",
    "danger": "#ff7b95",
    "overlay": "rgba(0,0,0,0.5)",
    "gradient": [
      "#2b1d28",
      "#1b1218"
    ],
    "navBackground": "#211620",
    "navActive": "#ff8fb6",
    "navInactive": "#8a6f7d",
    "chipBackground": "#33222c",
    "chipText": "#f6dbe6",
    "progressTrack": "#3c2733",
    "progressFill": "#ff8fb6"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.2,
    "uppercaseTitles": false,
    "sizes": {
      "xs": 12,
      "sm": 14,
      "md": 16,
      "lg": 19,
      "xl": 25,
      "xxl": 32,
      "banner": 36
    },
    "lineHeightScale": 1.45
  },
  "shapes": {
    "borderStyle": "squircle",
    "radius": {
      "none": 0,
      "sm": 12,
      "md": 20,
      "lg": 28,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 3
  },
  "presentation": {
    "cardStyle": "elevated",
    "navStyle": "pill",
    "iconStyle": "filled",
    "pattern": "petals",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(27,18,24,0.5)"
  }
};
