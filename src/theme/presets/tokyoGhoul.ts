import type { ThemePreset } from '@/theme/themeTypes';

/**
 * tokyoGhoul preset. Pure configuration: adding or editing a preset never requires
 * touching a screen because every token is resolved through the theme engine.
 */
export const tokyoGhoulPreset: ThemePreset = {
  "id": "tokyoGhoul",
  "nameKey": "themes.tokyoGhoul.name",
  "descriptionKey": "themes.tokyoGhoul.description",
  "light": {
    "background": "#f3f0ef",
    "backgroundAlt": "#e7e2e1",
    "surface": "#ffffff",
    "surfaceAlt": "#efe9e8",
    "card": "#ffffff",
    "cardBorder": "#cfc6c6",
    "text": "#161418",
    "textMuted": "#6b6266",
    "textInverse": "#ffffff",
    "primary": "#b3121f",
    "primaryText": "#ffffff",
    "secondary": "#3a3438",
    "accent": "#d61b2b",
    "accentText": "#ffffff",
    "success": "#1f8a5b",
    "warning": "#c98a00",
    "danger": "#d61b2b",
    "overlay": "rgba(20,14,16,0.5)",
    "gradient": [
      "#ffffff",
      "#ece4e3"
    ],
    "navBackground": "#ffffff",
    "navActive": "#b3121f",
    "navInactive": "#8b8186",
    "chipBackground": "#f2e9e9",
    "chipText": "#2a2327",
    "progressTrack": "#ddd2d2",
    "progressFill": "#d61b2b"
  },
  "dark": {
    "background": "#080708",
    "backgroundAlt": "#0d0c0e",
    "surface": "#111013",
    "surfaceAlt": "#16151a",
    "card": "#121116",
    "cardBorder": "#2b2730",
    "text": "#f1eeef",
    "textMuted": "#8e8791",
    "textInverse": "#080708",
    "primary": "#d61b2b",
    "primaryText": "#ffffff",
    "secondary": "#8c8794",
    "accent": "#ff3b30",
    "accentText": "#180000",
    "success": "#1f9d63",
    "warning": "#e0a100",
    "danger": "#ff3b30",
    "overlay": "rgba(0,0,0,0.72)",
    "gradient": [
      "#16121a",
      "#080708"
    ],
    "navBackground": "#0b0a0c",
    "navActive": "#ff3b30",
    "navInactive": "#5c5660",
    "chipBackground": "#1c1820",
    "chipText": "#ded7de",
    "progressTrack": "#2b2730",
    "progressFill": "#ff3b30"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.2,
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
    "lineHeightScale": 1.4
  },
  "shapes": {
    "borderStyle": "squircle",
    "radius": {
      "none": 0,
      "sm": 3,
      "md": 8,
      "lg": 14,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 1
  },
  "presentation": {
    "cardStyle": "outlined",
    "navStyle": "pill",
    "iconStyle": "outline",
    "pattern": "fracture",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(0,0,0,0.8)",
    "decorative": {
      "lineColor": "#d61b2b",
      "glowColor": "#7a0d16",
      "cornerStyle": "cut"
    }
  }
};
