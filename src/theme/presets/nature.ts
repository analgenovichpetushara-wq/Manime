import type { ThemePreset } from '@/theme/themeTypes';

/**
 * nature preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const naturePreset: ThemePreset = {
  "id": "nature",
  "nameKey": "themes.nature.name",
  "descriptionKey": "themes.nature.description",
  "light": {
    "background": "#f2f7f1",
    "backgroundAlt": "#e6efe4",
    "surface": "#ffffff",
    "surfaceAlt": "#eef5ed",
    "card": "#ffffff",
    "cardBorder": "#d3e2d1",
    "text": "#22302a",
    "textMuted": "#5d7268",
    "textInverse": "#ffffff",
    "primary": "#3f8f5f",
    "primaryText": "#ffffff",
    "secondary": "#6fae7d",
    "accent": "#9bc9a3",
    "accentText": "#1c3524",
    "success": "#3f8f5f",
    "warning": "#c39a41",
    "danger": "#c06346",
    "overlay": "rgba(34,48,42,0.4)",
    "gradient": [
      "#ffffff",
      "#e3f0e4"
    ],
    "navBackground": "#ffffff",
    "navActive": "#3f8f5f",
    "navInactive": "#8ba394",
    "chipBackground": "#e9f2e8",
    "chipText": "#2b3d33",
    "progressTrack": "#d9e7d8",
    "progressFill": "#3f8f5f"
  },
  "dark": {
    "background": "#0d1512",
    "backgroundAlt": "#111b17",
    "surface": "#131e19",
    "surfaceAlt": "#17251f",
    "card": "#16221c",
    "cardBorder": "#24382e",
    "text": "#e8f2ec",
    "textMuted": "#96ada1",
    "textInverse": "#0d1512",
    "primary": "#6fd39a",
    "primaryText": "#062616",
    "secondary": "#4f9c76",
    "accent": "#a8dcae",
    "accentText": "#062616",
    "success": "#6fd39a",
    "warning": "#e3c168",
    "danger": "#e28a72",
    "overlay": "rgba(0,0,0,0.55)",
    "gradient": [
      "#17251f",
      "#0d1512"
    ],
    "navBackground": "#111a16",
    "navActive": "#6fd39a",
    "navInactive": "#6d8577",
    "chipBackground": "#1c2b23",
    "chipText": "#d6e8dc",
    "progressTrack": "#24382e",
    "progressFill": "#6fd39a"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.1,
    "uppercaseTitles": false,
    "sizes": {
      "xs": 12,
      "sm": 14,
      "md": 16,
      "lg": 19,
      "xl": 25,
      "xxl": 31,
      "banner": 35
    },
    "lineHeightScale": 1.45
  },
  "shapes": {
    "borderStyle": "squircle",
    "radius": {
      "none": 0,
      "sm": 10,
      "md": 18,
      "lg": 26,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 2
  },
  "presentation": {
    "cardStyle": "elevated",
    "navStyle": "pill",
    "iconStyle": "outline",
    "pattern": "leaf",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(13,21,18,0.55)"
  }
};
