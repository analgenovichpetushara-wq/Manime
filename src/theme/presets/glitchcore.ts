import type { ThemePreset } from '@/theme/themeTypes';

/**
 * glitchcore preset. Pure configuration: adding or editing a preset never requires
 * touching a screen because every token is resolved through the theme engine.
 */
export const glitchcorePreset: ThemePreset = {
  "id": "glitchcore",
  "nameKey": "themes.glitchcore.name",
  "descriptionKey": "themes.glitchcore.description",
  "light": {
    "background": "#eef1f4",
    "backgroundAlt": "#e2e7ec",
    "surface": "#ffffff",
    "surfaceAlt": "#f0f3f7",
    "card": "#ffffff",
    "cardBorder": "#b9c3cf",
    "text": "#08090c",
    "textMuted": "#59616e",
    "textInverse": "#ffffff",
    "primary": "#00a86b",
    "primaryText": "#ffffff",
    "secondary": "#d6009c",
    "accent": "#f5c400",
    "accentText": "#1a1400",
    "success": "#00a86b",
    "warning": "#f5c400",
    "danger": "#e0245e",
    "overlay": "rgba(8,9,12,0.5)",
    "gradient": [
      "#ffffff",
      "#e7edf3"
    ],
    "navBackground": "#ffffff",
    "navActive": "#00a86b",
    "navInactive": "#7c8492",
    "chipBackground": "#e9eef4",
    "chipText": "#101620",
    "progressTrack": "#d3dbe4",
    "progressFill": "#d6009c"
  },
  "dark": {
    "background": "#04040a",
    "backgroundAlt": "#08080f",
    "surface": "#0b0b14",
    "surfaceAlt": "#101020",
    "card": "#0c0c16",
    "cardBorder": "#1d1f33",
    "text": "#eafff7",
    "textMuted": "#7f889b",
    "textInverse": "#04040a",
    "primary": "#00ff9d",
    "primaryText": "#00170e",
    "secondary": "#ff00e5",
    "accent": "#ffe600",
    "accentText": "#1a1600",
    "success": "#00ff9d",
    "warning": "#ffe600",
    "danger": "#ff00e5",
    "overlay": "rgba(0,0,0,0.75)",
    "gradient": [
      "#101020",
      "#04040a"
    ],
    "navBackground": "#07070e",
    "navActive": "#00ff9d",
    "navInactive": "#4d5468",
    "chipBackground": "#12152a",
    "chipText": "#d8fff0",
    "progressTrack": "#1d1f33",
    "progressFill": "#ff00e5"
  },
  "typography": {
    "fontFamilyDisplay": "monospace",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 1.4,
    "uppercaseTitles": true,
    "sizes": {
      "xs": 11,
      "sm": 13,
      "md": 15,
      "lg": 18,
      "xl": 23,
      "xxl": 29,
      "banner": 32
    },
    "lineHeightScale": 1.3
  },
  "shapes": {
    "borderStyle": "sharp",
    "radius": {
      "none": 0,
      "sm": 1,
      "md": 4,
      "lg": 8,
      "pill": 4
    },
    "borderWidth": 1.5,
    "elevation": 0
  },
  "presentation": {
    "cardStyle": "outlined",
    "navStyle": "underline",
    "iconStyle": "filled",
    "pattern": "glitch",
    "showGridMotif": true,
    "headlineTransform": "uppercase",
    "dimBackground": "rgba(0,0,0,0.78)",
    "decorative": {
      "lineColor": "#ff00e5",
      "glowColor": "#00ff9d",
      "cornerStyle": "square"
    }
  }
};
