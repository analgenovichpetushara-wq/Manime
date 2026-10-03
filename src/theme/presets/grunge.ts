import type { ThemePreset } from '@/theme/themeTypes';

/**
 * grunge preset. Pure configuration: adding or editing a preset never requires
 * touching a screen because every token is resolved through the theme engine.
 */
export const grungePreset: ThemePreset = {
  "id": "grunge",
  "nameKey": "themes.grunge.name",
  "descriptionKey": "themes.grunge.description",
  "light": {
    "background": "#dcd5c5",
    "backgroundAlt": "#d0c8b6",
    "surface": "#e9e3d5",
    "surfaceAlt": "#e2dbcb",
    "card": "#ece6d8",
    "cardBorder": "#b3a891",
    "text": "#2b2622",
    "textMuted": "#6a6157",
    "textInverse": "#efe9db",
    "primary": "#4a4238",
    "primaryText": "#efe9db",
    "secondary": "#7a6a54",
    "accent": "#a8552f",
    "accentText": "#f4efe4",
    "success": "#4d6b3a",
    "warning": "#a97b1c",
    "danger": "#9c3b2a",
    "overlay": "rgba(43,38,34,0.45)",
    "gradient": [
      "#e9e3d5",
      "#d3cbba"
    ],
    "navBackground": "#e6e0d1",
    "navActive": "#4a4238",
    "navInactive": "#837968",
    "chipBackground": "#dfd8c7",
    "chipText": "#332d27",
    "progressTrack": "#c6bda9",
    "progressFill": "#a8552f"
  },
  "dark": {
    "background": "#181612",
    "backgroundAlt": "#1e1b16",
    "surface": "#241f19",
    "surfaceAlt": "#2a251e",
    "card": "#262119",
    "cardBorder": "#453d31",
    "text": "#e8e0d2",
    "textMuted": "#9b9080",
    "textInverse": "#181612",
    "primary": "#cbb287",
    "primaryText": "#181612",
    "secondary": "#8f8371",
    "accent": "#d1693a",
    "accentText": "#181612",
    "success": "#6f8f52",
    "warning": "#d9a63c",
    "danger": "#c2503a",
    "overlay": "rgba(0,0,0,0.66)",
    "gradient": [
      "#2a251e",
      "#181612"
    ],
    "navBackground": "#1c1915",
    "navActive": "#d1693a",
    "navInactive": "#6e6558",
    "chipBackground": "#302a22",
    "chipText": "#e2d8c6",
    "progressTrack": "#453d31",
    "progressFill": "#d1693a"
  },
  "typography": {
    "fontFamilyDisplay": "Courier New",
    "fontFamilyBody": "System",
    "fontFamilyMono": "Courier New",
    "letterSpacing": 0.3,
    "uppercaseTitles": false,
    "sizes": {
      "xs": 11,
      "sm": 13,
      "md": 15,
      "lg": 18,
      "xl": 24,
      "xxl": 30,
      "banner": 33
    },
    "lineHeightScale": 1.45
  },
  "shapes": {
    "borderStyle": "rounded",
    "radius": {
      "none": 0,
      "sm": 5,
      "md": 12,
      "lg": 20,
      "pill": 999
    },
    "borderWidth": 2,
    "elevation": 1
  },
  "presentation": {
    "cardStyle": "outlined",
    "navStyle": "tabs",
    "iconStyle": "outline",
    "pattern": "noise",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(10,9,7,0.7)",
    "decorative": {
      "lineColor": "#a8552f",
      "glowColor": "#cbb287",
      "cornerStyle": "round"
    }
  }
};
