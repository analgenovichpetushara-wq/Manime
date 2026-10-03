# Customization system

Everything visual in AnimAlc is data. A screen never hardcodes a colour, a
radius, a font, an effect or a background — it reads a token from the theme
context. Adding a preset, an effect, a card style or a navigation style is a
configuration change in `src/theme`, never a screen change.

```
theme/
  presets/            13 built-in presets (one file each) + registry
  themeTypes.ts       token contracts (colours, typography, shapes, presentation)
  themeEngine.ts      preset + user overrides + AMOLED + accent -> ResolvedTheme
  effects.ts          effect catalogue, intensity levels, accessibility/perf caps
  cardStyles.ts       10 anime card styles
  navStyles.ts        7 navigation styles
  backgrounds.ts      per-screen background configuration (media referenced, never edited)
  customThemes.ts     user-created themes: create/duplicate/export/import/validate
  ThemeProvider.tsx   exposes theme + effects + card style + nav style + backgrounds
store/customizationStore.ts   persisted effects, styles, backgrounds, themes, accessibility
ui/BackgroundLayer.tsx        renders the configured background
ui/EffectsLayer.tsx           renders the resolved effects
```

## Presets

`minimalist`, `evangelion`, `tokyoGhoul`, `glitchcore`, `cyberpunk`, `y2k`,
`darkGothic`, `grunge`, `animeNeon`, `retroWave`, `romance`, `darkAcademia`,
`nature`.

Each preset defines a light and a dark palette, typography, shapes and
presentation tokens. `findPreset(id, extras)` resolves user themes before the
built-ins, which is how a custom theme becomes selectable everywhere.

## Effects

17 effects (`crt`, `vhs`, `scanlines`, `filmGrain`, `noise`, `rgbSplit`,
`chromaticAberration`, `glitch`, `pixelation`, `blur`, `bloom`, `glow`,
`vignette`, `particles`, `floatingParticles`, `animatedGradient`, `distortion`),
each with five levels: off / low / medium / high / extreme.

`resolveEffects()` is the single place where a configuration becomes runtime
state. It applies, in order:

1. preset defaults (`PRESET_EFFECTS`),
2. user overrides,
3. the performance mode (`auto` / `high` / `balanced` / `battery`),
4. accessibility rules — Reduce Motion stops animation, *Disable flashing
   effects* removes anything that flashes, high contrast caps overlay effects,
   *Reduced blur* removes blur, reduced transparency halves bloom/glow.

The Effects screen also offers **preset intensity** (Low / Medium / High /
Extreme) which sets every effect of the active preset at once, so a heavy preset
can always be dialled down instead of turned off.

`EffectsLayer` draws only what is enabled and draws nothing at all when the
resolved set is empty.

## Card and navigation styles

Card styles: standard, minimal, glass, neon, glitch, manga, VHS, polaroid,
gothic, cyberpunk — they control radius, border, shadow, glow, artwork ratio,
title placement, badges and press feedback. `PosterCard` consumes the tokens.

Navigation styles: standard, floating, glass, neon, vertical, compact,
icons-only. The shared `ThemedTabBar` renders all seven; the vertical rail insets
the tab content by the rail width instead of overlapping it.

## Backgrounds

A background is a **reference** to a library asset (or an external URI) plus a
purely visual configuration: fit, zoom, X/Y offset, rotation, blur, opacity,
brightness, contrast, saturation, grayscale, vignette, overlay colour, gradient,
animation and parallax. The original file is never rewritten — editing a
background only changes how the layer is composited.

Screens: home, search, details, player, profile, settings, achievements, library,
Watch Together, or the entire application (*Use one background everywhere*).
When that option is off, a per-screen configuration overrides the global one.

## Custom themes

A custom theme is a diff on a base preset: colours per mode, typography, shapes,
presentation, effect levels, card style, navigation style and an optional
background. Operations: create, edit, duplicate, rename, delete, apply, set as
default, export and import.

Exported themes are compact JSON (`{"format":"animalc-theme","version":1,…}`)
that reference media by asset id instead of embedding it. `importCustomTheme()`
validates the document — unknown formats, wrong versions and non-JSON input are
rejected with a translated error and never applied.

## Persistence

`store/customizationStore.ts` persists effect levels, the animation switch, card
style, navigation style, backgrounds, custom themes, the default theme, the
performance mode and the accessibility switches. It survives restarts (covered by
`__tests__/customization.test.ts` and `__tests__/persistence.test.ts`).

## Performance and accessibility

Heavy effects are only drawn where they are enabled. `battery` mode drops
particles, distortion, blur, bloom and VHS and caps everything at *low*. The
accessibility switches (reduce motion, disable flashing, high contrast, larger
text, reduced transparency, reduced blur, simplified UI, readable text) always win
over a preset or a user level, so customization can never make the app unusable or
unsafe.
