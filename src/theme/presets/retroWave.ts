import type { ThemePreset } from '@/theme/themeTypes';

/**
 * retroWave preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const retroWavePreset: ThemePreset = {
  "id": "retroWave",
  "nameKey": "themes.retroWave.name",
  "descriptionKey": "themes.retroWave.description",
  "light": {
    "background": "#fdf3ff",
    "backgroundAlt": "#f6e6ff",
    "surface": "#ffffff",
    "surfaceAlt": "#fbeaff",
    "card": "#ffffff",
    "cardBorder": "#eccff5",
    "text": "#2a1436",
    "textMuted": "#7f5f8e",
    "textInverse": "#ffffff",
    "primary": "#c8189a",
    "primaryText": "#ffffff",
    "secondary": "#2b7fd6",
    "accent": "#f08000",
    "accentText": "#ffffff",
    "success": "#2fa37a",
    "warning": "#e09b18",
    "danger": "#d9455f",
    "overlay": "rgba(42,20,54,0.4)",
    "gradient": [
      "#ffe9fb",
      "#dff0ff"
    ],
    "navBackground": "#ffffff",
    "navActive": "#c8189a",
    "navInactive": "#b394c0",
    "chipBackground": "#f7e6ff",
    "chipText": "#3f1d50",
    "progressTrack": "#f0d8f7",
    "progressFill": "#c8189a"
  },
  "dark": {
    "background": "#160e2a",
    "backgroundAlt": "#1c1236",
    "surface": "#1f1440",
    "surfaceAlt": "#241a4a",
    "card": "#241a4a",
    "cardBorder": "#3b2a6b",
    "text": "#f6e9ff",
    "textMuted": "#b39ddb",
    "textInverse": "#160e2a",
    "primary": "#ff5fc8",
    "primaryText": "#2a0730",
    "secondary": "#5fd0ff",
    "accent": "#ffd166",
    "accentText": "#2a1e00",
    "success": "#5fd0a0",
    "warning": "#ffd166",
    "danger": "#ff5f8f",
    "overlay": "rgba(11,6,24,0.62)",
    "gradient": [
      "#ff5fc8",
      "#5fd0ff"
    ],
    "navBackground": "#1a1034",
    "navActive": "#ff5fc8",
    "navInactive": "#8f7cc0",
    "chipBackground": "#2c1f56",
    "chipText": "#ecdcff",
    "progressTrack": "#3b2a6b",
    "progressFill": "#ff5fc8"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.8,
    "uppercaseTitles": true,
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
      "sm": 6,
      "md": 12,
      "lg": 20,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 2
  },
  "presentation": {
    "cardStyle": "elevated",
    "navStyle": "pill",
    "iconStyle": "filled",
    "pattern": "sunset-grid",
    "showGridMotif": true,
    "headlineTransform": "uppercase",
    "dimBackground": "rgba(11,6,24,0.6)",
    "decorative": {
      "lineColor": "#5fd0ff",
      "glowColor": "#ff5fc8",
      "cornerStyle": "round"
    }
  }
};
