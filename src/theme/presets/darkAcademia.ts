import type { ThemePreset } from '@/theme/themeTypes';

/**
 * darkAcademia preset. Every visual token lives in data — screens never hardcode colors,
 * radii or fonts.
 */
export const darkAcademiaPreset: ThemePreset = {
  "id": "darkAcademia",
  "nameKey": "themes.darkAcademia.name",
  "descriptionKey": "themes.darkAcademia.description",
  "light": {
    "background": "#f5efe2",
    "backgroundAlt": "#ebe3d2",
    "surface": "#fffaf0",
    "surfaceAlt": "#f6efe1",
    "card": "#fffaf0",
    "cardBorder": "#dfd3ba",
    "text": "#2f2a20",
    "textMuted": "#6f6455",
    "textInverse": "#fffaf0",
    "primary": "#6b5a3e",
    "primaryText": "#fffaf0",
    "secondary": "#5f6b4a",
    "accent": "#8a7350",
    "accentText": "#fffaf0",
    "success": "#5c7a4a",
    "warning": "#b8862b",
    "danger": "#a4452f",
    "overlay": "rgba(47,42,32,0.45)",
    "gradient": [
      "#fffaf0",
      "#efe6d3"
    ],
    "navBackground": "#fffaf0",
    "navActive": "#6b5a3e",
    "navInactive": "#9c8f78",
    "chipBackground": "#efe6d3",
    "chipText": "#3d3527",
    "progressTrack": "#e3d8c2",
    "progressFill": "#6b5a3e"
  },
  "dark": {
    "background": "#14110c",
    "backgroundAlt": "#1a1610",
    "surface": "#1c1811",
    "surfaceAlt": "#221d15",
    "card": "#221c14",
    "cardBorder": "#3a3123",
    "text": "#ece3d2",
    "textMuted": "#a99a80",
    "textInverse": "#14110c",
    "primary": "#c9b083",
    "primaryText": "#241c0f",
    "secondary": "#8b9a6b",
    "accent": "#a99368",
    "accentText": "#241c0f",
    "success": "#8b9a6b",
    "warning": "#d6a94f",
    "danger": "#c96a4f",
    "overlay": "rgba(0,0,0,0.6)",
    "gradient": [
      "#221c14",
      "#14110c"
    ],
    "navBackground": "#171309",
    "navActive": "#c9b083",
    "navInactive": "#7d6f57",
    "chipBackground": "#2a2318",
    "chipText": "#e2d6bd",
    "progressTrack": "#3a3123",
    "progressFill": "#c9b083"
  },
  "typography": {
    "fontFamilyDisplay": "serif",
    "fontFamilyBody": "serif",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.4,
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
    "borderStyle": "rounded",
    "radius": {
      "none": 0,
      "sm": 4,
      "md": 8,
      "lg": 14,
      "pill": 10
    },
    "borderWidth": 1,
    "elevation": 1
  },
  "presentation": {
    "cardStyle": "outlined",
    "navStyle": "underline",
    "iconStyle": "outline",
    "pattern": "paper",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(20,17,12,0.6)",
    "decorative": {
      "lineColor": "#c9b083",
      "cornerStyle": "round"
    }
  }
};
