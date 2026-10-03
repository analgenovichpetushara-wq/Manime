import type { ThemePreset } from '@/theme/themeTypes';

/**
 * y2k preset. Pure configuration: adding or editing a preset never requires
 * touching a screen because every token is resolved through the theme engine.
 */
export const y2kPreset: ThemePreset = {
  "id": "y2k",
  "nameKey": "themes.y2k.name",
  "descriptionKey": "themes.y2k.description",
  "light": {
    "background": "#eaf1ff",
    "backgroundAlt": "#dfe9ff",
    "surface": "#ffffff",
    "surfaceAlt": "#f2f7ff",
    "card": "#ffffff",
    "cardBorder": "#c3d4f2",
    "text": "#0d1524",
    "textMuted": "#5c6a86",
    "textInverse": "#ffffff",
    "primary": "#3d7dff",
    "primaryText": "#ffffff",
    "secondary": "#ff7ad9",
    "accent": "#8fa4c8",
    "accentText": "#0d1524",
    "success": "#12a06a",
    "warning": "#d99a00",
    "danger": "#e0356b",
    "overlay": "rgba(13,21,36,0.42)",
    "gradient": [
      "#dff0ff",
      "#ffd9f3"
    ],
    "navBackground": "#f7fbff",
    "navActive": "#3d7dff",
    "navInactive": "#8593ad",
    "chipBackground": "#e7f0ff",
    "chipText": "#16233c",
    "progressTrack": "#d6e3f7",
    "progressFill": "#3d7dff"
  },
  "dark": {
    "background": "#0b1020",
    "backgroundAlt": "#101728",
    "surface": "#151d31",
    "surfaceAlt": "#1a2439",
    "card": "#161f34",
    "cardBorder": "#27354f",
    "text": "#eef4ff",
    "textMuted": "#8f9db8",
    "textInverse": "#0b1020",
    "primary": "#6aa6ff",
    "primaryText": "#04102a",
    "secondary": "#ff8ae0",
    "accent": "#b9c6e0",
    "accentText": "#0b1020",
    "success": "#20c48a",
    "warning": "#ffcf5c",
    "danger": "#ff6b9a",
    "overlay": "rgba(4,8,18,0.62)",
    "gradient": [
      "#22314f",
      "#0b1020"
    ],
    "navBackground": "#101729",
    "navActive": "#6aa6ff",
    "navInactive": "#5f6c86",
    "chipBackground": "#1d2740",
    "chipText": "#dbe6ff",
    "progressTrack": "#27354f",
    "progressFill": "#6aa6ff"
  },
  "typography": {
    "fontFamilyDisplay": "System",
    "fontFamilyBody": "System",
    "fontFamilyMono": "monospace",
    "letterSpacing": 0.4,
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
      "sm": 8,
      "md": 16,
      "lg": 26,
      "pill": 999
    },
    "borderWidth": 1,
    "elevation": 4
  },
  "presentation": {
    "cardStyle": "elevated",
    "navStyle": "pill",
    "iconStyle": "filled",
    "pattern": "chrome",
    "showGridMotif": false,
    "headlineTransform": "none",
    "dimBackground": "rgba(6,10,22,0.66)",
    "decorative": {
      "lineColor": "#8fa4c8",
      "glowColor": "#6aa6ff",
      "cornerStyle": "round"
    }
  }
};
