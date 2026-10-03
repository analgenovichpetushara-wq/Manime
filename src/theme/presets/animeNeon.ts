import type { ThemePreset } from '@/theme/themeTypes';

/**
 * animeNeon preset. Pure configuration: adding or editing a preset never requires
 * touching a screen because every token is resolved through the theme engine.
 */
export const animeNeonPreset: ThemePreset = {
  "id": "animeNeon",
  "nameKey": "themes.animeNeon.name",
  "descriptionKey": "themes.animeNeon.description",
  "light": {
    "background": "#f8f1ff",
    "backgroundAlt": "#f0e6ff",
    "surface": "#ffffff",
    "surfaceAlt": "#f6efff",
    "card": "#ffffff",
    "cardBorder": "#dcc9f5",
    "text": "#1a0f2b",
    "textMuted": "#6b5a86",
    "textInverse": "#ffffff",
    "primary": "#d61fb0",
    "primaryText": "#ffffff",
    "secondary": "#2f86ff",
    "accent": "#8b3dff",
    "accentText": "#ffffff",
    "success": "#12a06a",
    "warning": "#e09b00",
    "danger": "#e63a76",
    "overlay": "rgba(26,15,43,0.4)",
    "gradient": [
      "#ffe9fb",
      "#e3ecff"
    ],
    "navBackground": "#ffffff",
    "navActive": "#d61fb0",
    "navInactive": "#8d7fa8",
    "chipBackground": "#f6ecff",
    "chipText": "#2a1740",
    "progressTrack": "#e3d6f7",
    "progressFill": "#d61fb0"
  },
  "dark": {
    "background": "#0b0616",
    "backgroundAlt": "#120a22",
    "surface": "#170d2c",
    "surfaceAlt": "#1e1238",
    "card": "#1a0f31",
    "cardBorder": "#3a2560",
    "text": "#f4ecff",
    "textMuted": "#9c8bbd",
    "textInverse": "#0b0616",
    "primary": "#ff4ecd",
    "primaryText": "#210016",
    "secondary": "#38b6ff",
    "accent": "#a06bff",
    "accentText": "#0b0616",
    "success": "#1fd39a",
    "warning": "#ffc94d",
    "danger": "#ff4d7d",
    "overlay": "rgba(4,2,10,0.68)",
    "gradient": [
      "#2a1552",
      "#0b0616"
    ],
    "navBackground": "#100820",
    "navActive": "#ff4ecd",
    "navInactive": "#5f4d80",
    "chipBackground": "#251645",
    "chipText": "#ecdfff",
    "progressTrack": "#3a2560",
    "progressFill": "#a06bff"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.5,
    "uppercaseTitles": false,
    "sizes": {
      "xs": 11,
      "sm": 13,
      "md": 15,
      "lg": 18,
      "xl": 25,
      "xxl": 31,
      "banner": 36
    },
    "lineHeightScale": 1.35
  },
  "shapes": {
    "borderStyle": "rounded",
    "radius": {
      "none": 0,
      "sm": 7,
      "md": 14,
      "lg": 24,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 3
  },
  "presentation": {
    "cardStyle": "elevated",
    "navStyle": "pill",
    "iconStyle": "filled",
    "pattern": "aurora",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(6,3,14,0.7)",
    "decorative": {
      "lineColor": "#ff4ecd",
      "glowColor": "#38b6ff",
      "cornerStyle": "round"
    }
  }
};
