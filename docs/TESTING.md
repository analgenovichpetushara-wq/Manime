# Testing and verification

## Commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` over `src` and `__tests__` |
| `npm run lint` | ESLint (eslint-config-expo + react-hooks rules) |
| `npm test` | Jest (`jest-expo` preset, 24 suites / 194 tests) |
| `npm run export:android` | Metro production bundle for Android (validates `@/` resolution) |
| `npm run export:ios` | Metro production bundle for iOS |
| `npm run server:smoke` | runtime check: boots the relay and drives two real WebSocket clients |
| `npm run verify` | typecheck + lint + tests + sync smoke + both platform bundles |
| `npm run providers:check` | live probe of every public provider API |
| `npm run server:watchtogether` | runs the Watch Together relay node |
| `npm run server:kodik` | runs the Kodik gateway that holds the partner token server-side |
| `npx expo prebuild -p android` | generates the Android project and applies the release-signing plugin |

## Coverage map

| Suite | Area |
| --- | --- |
| `__tests__/providers.cvh.test.ts` | CdnVideoHub: parsing a pasted iframe url / id / `cvh:` reference, mapping the captured playlist (one episode per dub, one voiceover per studio) and the Odnoklassniki `sources` keys onto real qualities, streaming through the registry, honest `NOT_FOUND` for the missing catalogue, empty-sources → `STREAM_UNAVAILABLE`, health probe |
| `__tests__/providers.anilibria.test.ts` | AniLiberty mapping (release → title, episodes, HLS 480/720/1080, skip timings, mature flag), absolute media urls, client-side filter application (format/year/status/genre/minimum episodes), and `external_player` handling: embed link absolutized, a CdnVideoHub link becomes a CVH provider ref, and a searched title then streams through CVH |
| `__tests__/providers.kodik.test.ts` | Kodik mapping from captured payloads (material → model, seasons → episodes, translations, derived qualities) and provider behaviour: search, episode/voiceover resolution, token error → `AUTHENTICATION_REQUIRED`, rate limit, malformed payload, network failure, missing material, no fabricated stream, health probe, and merged search with Kodik unauthenticated |
| `__tests__/kodikGateway.test.ts` | gateway as a real node process against a stubbed upstream: token injected server-side and never echoed, parameter whitelist (`/get-player` included), documented catalogue routes (`/genres`, `/qualities/v2`, …) proxied, junk routes 404, Kodik token failure → 401, upstream timeout → 504, rate limiting → 429, 503 without a token |
| `__tests__/embedPlayer.test.tsx` | source embed player: the official Kodik link is handed to the web view, and any non-http(s) link is refused |
| `__tests__/androidSigning.test.ts` | release signing: the prebuild plugin injects a keystore-driven `signingConfigs` block (no literal secrets), blocks unsigned release builds instead of emitting an uninstallable APK, is idempotent, is registered in `app.config.ts`, and the generated `android/app/build.gradle` carries it |
| `__tests__/providerMigration.test.ts` | retired-provider data migration: re-matched entries are rebound, unmatched ones are preserved with `legacyProviderId`, the persisted document is rewritten once, and a broken store never breaks bootstrap |
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
| `__tests__/playback.stream-failure.e2e.test.tsx` | end-to-end resilience: an episode without a media URL keeps the player mounted and operable, offers the source player and opens the Kodik embed in-app |

Provider fixtures live in `__tests__/fixtures/kodik.ts` and
`__tests__/fixtures/releases.ts`; both mirror recorded responses from the real
APIs, so mapping regressions surface without network access.
`__tests__/helpers/playbackProviderDouble.ts` is a test-only provider used to
exercise the native-player half of the chain (play/pause/progress): Kodik
publishes an embed link rather than a media URL, so no shipped provider can
serve that step. `react-native-webview` is stubbed in `jest.setup.js`.

The end-to-end suites never touch the network: `__tests__/helpers/playbackHarness.tsx`
installs an offline `fetch` stub for the recorded provider responses and then runs the
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
