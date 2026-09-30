import type { ThemePreset } from '@/theme/themeTypes';

/**
 * cyberpunk preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const cyberpunkPreset: ThemePreset = {
  "id": "cyberpunk",
  "nameKey": "themes.cyberpunk.name",
  "descriptionKey": "themes.cyberpunk.description",
  "light": {
    "background": "#f2f5ff",
    "backgroundAlt": "#e6ebff",
    "surface": "#ffffff",
    "surfaceAlt": "#eef2ff",
    "card": "#ffffff",
    "cardBorder": "#c4cdf0",
    "text": "#0a0a14",
    "textMuted": "#5a6280",
    "textInverse": "#ffffff",
    "primary": "#0b6bd6",
    "primaryText": "#ffffff",
    "secondary": "#e0218a",
    "accent": "#e0a100",
    "accentText": "#1a1400",
    "success": "#0f9d63",
    "warning": "#c98a00",
    "danger": "#d32f4a",
    "overlay": "rgba(10,10,20,0.5)",
    "gradient": [
      "#ffffff",
      "#e3e9ff"
    ],
    "navBackground": "#ffffff",
    "navActive": "#0b6bd6",
    "navInactive": "#7d85a3",
    "chipBackground": "#e8edff",
    "chipText": "#101632",
    "progressTrack": "#d5dbf5",
    "progressFill": "#0b6bd6"
  },
  "dark": {
    "background": "#04040a",
    "backgroundAlt": "#070713",
    "surface": "#0a0a18",
    "surfaceAlt": "#0e0e22",
    "card": "#0b0b1c",
    "cardBorder": "#182345",
    "text": "#e9f6ff",
    "textMuted": "#7d8bab",
    "textInverse": "#04040a",
    "primary": "#22e3ff",
    "primaryText": "#02141a",
    "secondary": "#ff3ea5",
    "accent": "#ffe14d",
    "accentText": "#1a1500",
    "success": "#22e3ff",
    "warning": "#ffe14d",
    "danger": "#ff3ea5",
    "overlay": "rgba(0,0,0,0.7)",
    "gradient": [
      "#0b0b1c",
      "#04040a"
    ],
    "navBackground": "#06060f",
    "navActive": "#22e3ff",
    "navInactive": "#4f5a78",
    "chipBackground": "#101a33",
    "chipText": "#cfe9ff",
    "progressTrack": "#182345",
    "progressFill": "#ff3ea5"
  },
  "typography": {
    "fontFamilyDisplay": "monospace",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 1.1,
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
    "borderStyle": "sharp",
    "radius": {
      "none": 0,
      "sm": 2,
      "md": 6,
      "lg": 12,
      "pill": 4
    },
    "borderWidth": 1.5,
    "elevation": 0
  },
  "presentation": {
    "cardStyle": "outlined",
    "navStyle": "underline",
    "iconStyle": "filled",
    "pattern": "scanline",
    "showGridMotif": true,
    "headlineTransform": "uppercase",
    "dimBackground": "rgba(0,0,0,0.75)",
    "decorative": {
      "lineColor": "#ff3ea5",
      "glowColor": "#22e3ff",
      "cornerStyle": "cut"
    }
  }
};
