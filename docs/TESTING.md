# Testing and verification

## Commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` over `src` and `__tests__` |
| `npm run lint` | ESLint (eslint-config-expo + react-hooks rules) |
| `npm test` | Jest (`jest-expo` preset, 18 suites / 147 tests) |
| `npm run export:android` | Metro production bundle for Android (validates `@/` resolution) |
| `npm run export:ios` | Metro production bundle for iOS |
| `npm run server:smoke` | runtime check: boots the relay and drives two real WebSocket clients |
| `npm run verify` | typecheck + lint + tests + sync smoke + both platform bundles |
| `npm run providers:check` | live probe of every public provider API |
| `npm run server:watchtogether` | runs the Watch Together relay node |

## Coverage map

| Suite | Area |
| --- | --- |
| `__tests__/providers.anilibria.test.ts` | AniLiberty mapping: releases, episodes, voiceovers, quality variants, HLS absolutisation, malformed payloads |
| `__tests__/providers.metadata.test.ts` | Anime365 + Shikimori mapping, duration normalisation, degraded network handling |
| `__tests__/providerManager.test.ts` | registration, capability filtering, health classification, fallback ordering, merged/deduplicated search, failure isolation |
| `__tests__/theme.test.ts` | every preset has a complete light/dark token set, presets change typography/shapes/presentation, accent application, AMOLED, contrast, font scaling, palette immutability |
| `__tests__/i18n.test.ts` | ru/en parity, placeholder parity, no empty strings, achievement keys, localised group labels for every editable prefix, override isolation, placeholder validation |
| `__tests__/progress.test.ts` | watch progress persistence, continue-watching ordering, statistics derived from real completions, streaks, restart rehydration |
| `__tests__/achievements.test.ts` | catalogue integrity (66 achievements), unlock rules from real metrics, unlock timestamp stability, progress monotonicity, category grouping |
| `__tests__/banners.library.test.ts` | banner CRUD/reorder/enable, text edits never touching the stored image, library asset usage flags, persistence |
| `__tests__/syncEngine.test.ts` | Watch Together drift model: projection, tolerance, nudge vs. hard seek, play/pause, episode change, rate clamping |
| `__tests__/app.boot.test.tsx` | boots the shipped `App`: hydration gate, `NavigationContainer` above `AppShell`, tabs + stack, and the global details dialog opened from the shell without a navigation error |
| `__tests__/customization.test.ts` | 13 presets, custom-theme resolution, effects engine (intensity, accessibility caps, performance modes), card/nav styles, background sanitising, theme export/import validation, customization restart persistence |
| `__tests__/customization.ui.test.tsx` | renders the customization screens under every new preset, a card in each of the 10 card styles, the tab bar in each of the 7 navigation styles, and the effects layer on/off |
| `__tests__/persistence.test.ts` | cold-start survival of profile, avatar/banner, favourites, watchlists, playback position, achievements, theme, overrides, custom text and settings, plus recovery from a corrupted snapshot |
| `__tests__/watchTogetherServer.test.ts` | integration: real relay node, room creation, join, playback propagation, guest read-only, chat both ways, health endpoint, unknown room, host promotion |
| `__tests__/playback.e2e.test.tsx` | end-to-end: typed query → debounced global search over the stubbed public API → result card → animated details dialog |
| `__tests__/playback.player.e2e.test.tsx` | end-to-end: Player screen resolves a real provider stream plan, play/pause, episode drawer, persisted resumable progress |
| `__tests__/playback.stream-failure.e2e.test.tsx` | end-to-end resilience: unknown episode / unavailable stream keeps the player mounted and operable |

Provider fixtures live in `__tests__/fixtures/releases.ts` and mirror the shape of
the real APIs, so mapping regressions surface without network access.

The end-to-end suites never touch the network: `__tests__/helpers/playbackHarness.tsx`
installs an offline `fetch` stub for the public AniLiberty routes and then runs the
real chain (http client → provider → mapper → playback plan → player). The native
modules Jest cannot host are stubbed once in `jest.setup.js` (reanimated/worklets
and `expo-video`), so the player logic under test is the shipped one.

## Manual verification checklist

Performed on every release candidate:

- Cold start on a device: the app reaches the Home tab (no error boundary).
- Every tab and stack screen opened in light and dark mode, and in at least three
  presets (Minimalist, Cyberpunk, Retro Wave).
- Customization: Effects screen at every intensity, each card style, each
  navigation style, a per-screen gallery background, a created/exported/imported
  custom theme, and every accessibility switch.
- Details dialog: fade + scale animation, dim backdrop, rounded corners, close
  button, providers/voiceovers, Watch, Add to Favorites.
- Player: play/pause, seek, ±10 s, fullscreen, quality, speed, voiceover switch,
  episode drawer, next/prev, intro skip prompt, subtitle styling, autoplay,
  progress restore, Watch Together chip while synced.
- Watch Together: create room, join with a code, participants, host controls,
  guest read-only, chat, leave message.
- Profile: banner/avatar pickers from gallery **and** AnimAlc Library, bio/name
  editing, statistics derived from real data.
- Achievements: locked/unlocked states, progress bars, category grouping.
- Customization, Custom Text, Banner Studio, Library, Providers, Cache, About.
- Failure paths: airplane mode, provider down, malformed response, missing
  episode, image failure, empty cache — a themed error or empty state, no crash.
- Restart persistence: profile, avatar, banner, bio, favourites, watchlists,
  progress, achievements, theme, customization, banners, custom text and library
  metadata all survive a cold start.
