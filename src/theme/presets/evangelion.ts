import type { ThemePreset } from '@/theme/themeTypes';

/**
 * evangelion preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const evangelionPreset: ThemePreset = {
  "id": "evangelion",
  "nameKey": "themes.evangelion.name",
  "descriptionKey": "themes.evangelion.description",
  "light": {
    "background": "#eef1f0",
    "backgroundAlt": "#e2e7e5",
    "surface": "#ffffff",
    "surfaceAlt": "#f3f6f5",
    "card": "#ffffff",
    "cardBorder": "#c9d2cf",
    "text": "#0f1a16",
    "textMuted": "#5d6b66",
    "textInverse": "#ffffff",
    "primary": "#1c7a45",
    "primaryText": "#ffffff",
    "secondary": "#4b4fbf",
    "accent": "#d9551f",
    "accentText": "#ffffff",
    "success": "#1c7a45",
    "warning": "#c47a15",
    "danger": "#c0392b",
    "overlay": "rgba(8,14,11,0.5)",
    "gradient": [
      "#ffffff",
      "#dfe7e3"
    ],
    "navBackground": "#ffffff",
    "navActive": "#1c7a45",
    "navInactive": "#7b8883",
    "chipBackground": "#e3eae7",
    "chipText": "#123024",
    "progressTrack": "#d3dbd8",
    "progressFill": "#1c7a45"
  },
  "dark": {
    "background": "#05060a",
    "backgroundAlt": "#080b11",
    "surface": "#0d1017",
    "surfaceAlt": "#11161f",
    "card": "#101521",
    "cardBorder": "#1d2430",
    "text": "#e8edf2",
    "textMuted": "#8b97a6",
    "textInverse": "#05060a",
    "primary": "#7bdc8a",
    "primaryText": "#04140a",
    "secondary": "#6f7cff",
    "accent": "#ff6a2b",
    "accentText": "#1a0b02",
    "success": "#7bdc8a",
    "warning": "#ffc861",
    "danger": "#ff4d4d",
    "overlay": "rgba(0,0,0,0.65)",
    "gradient": [
      "#0d1017",
      "#05060a"
    ],
    "navBackground": "#070a10",
    "navActive": "#7bdc8a",
    "navInactive": "#5f6a78",
    "chipBackground": "#151b26",
    "chipText": "#c8d3e0",
    "progressTrack": "#1d2430",
    "progressFill": "#7bdc8a"
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
    "iconStyle": "outline",
    "pattern": "grid",
    "showGridMotif": true,
    "headlineTransform": "uppercase",
    "dimBackground": "rgba(0,0,0,0.72)",
    "decorative": {
      "lineColor": "#7bdc8a",
      "glowColor": "#7bdc8a",
      "cornerStyle": "cut"
    }
  }
};
