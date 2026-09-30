# AnimAlc

A cross-platform anime client for Android and iOS built with React Native and
Expo SDK 57: discovery, global search across providers, a native player, watch
progress, watchlists, a Discord-inspired profile, 66 achievements, a fully
configurable theme and text system, a local media library, custom home banners
and synchronised Watch Together sessions.

Everything is stored on the device. AnimAlc only uses public APIs; it never
bypasses authentication, DRM, access controls or age gates.

## Quick start

```bash
npm install
cp .env.example .env       # optional: point Watch Together at your sync node
npm start                  # Expo dev server
npm run android            # or: npm run ios
```

## Verify

```bash
npm run verify             # typecheck + lint + tests + Android/iOS bundles
npm run providers:check    # live probe of the public provider APIs
npm run server:watchtogether
```

## Features

- **Discovery & search** — catalogue, schedule, genre/year/status filters, global
  search merged and deduplicated across every enabled provider.
- **Details dialog** — floating animated modal with cover, genres, synopsis,
  providers, voiceovers, Watch and Add to Favorites.
- **Player** — native playback (HLS/DASH/MP4), play/pause, seek, ±10 s, speed,
  quality, voiceover switching, episode drawer, next/prev, subtitle styling,
  autoplay, intro/outro skip, resume from the saved position.
- **Progress & watchlists** — episode, position, provider and voiceover are
  persisted; Watching / Planned / Completed / Dropped / Favorites with move support.
- **Profile** — wide banner, circular avatar, bio, real statistics, achievements;
  avatar/banner from the gallery or the AnimAlc Library, GIF-aware.
- **Achievements** — 66 achievements in 9 categories, unlocked strictly from
  stored watch data, with progress bars and persistence.
- **Theming** — 7 JSON presets (Minimalist, Evangelion, Cyberpunk, Romance, Dark
  Academia, Retro Wave, Nature) that change colours, typography, shapes,
  backgrounds, icons and navigation, plus light/dark/AMOLED, custom accent,
  contrast readout and JSON overrides.
- **Custom text** — every user-facing string is an id; override any caption in
  Russian or English with placeholder safety, without touching images or code.
- **Custom banners** — create, edit, reorder, enable, preview; media from the
  gallery or the library; text config is stored separately from image assets.
- **Library** — import, preview, delete and reuse photos/GIFs as avatar, banner
  or background; originals are preserved.
- **Watch Together** — WebSocket room sync (play/pause/seek/episode/rate/chat) with
  gradual drift correction and hard seeks only for large differences.
- **Settings** — appearance, playback, subtitles, notifications, cache management,
  downloads/Wi-Fi only, language, font scaling, provider diagnostics.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, persistence, error model
- [`docs/PROVIDERS.md`](docs/PROVIDERS.md) — provider abstraction, sources, health, adding a source
- [`docs/WATCH_TOGETHER.md`](docs/WATCH_TOGETHER.md) — protocol, server, deployment
- [`docs/TESTING.md`](docs/TESTING.md) — commands, coverage map, manual checklist

## Licence and legal

AnimAlc plays media hosted by third-party public APIs and does not store or
redistribute content. Metadata marked 18+ is preserved when a provider serves it
and can be hidden in Settings.
