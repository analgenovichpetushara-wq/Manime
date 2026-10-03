# AnimAlc architecture

AnimAlc is a feature-based React Native (Expo SDK 57) application. Nothing is a
monolith: screens, data, providers, storage and theming live in separate layers
and talk to each other through narrow interfaces.

```
src/
  App.tsx                 app entry: hydration gate, providers, error boundary
  core/                   cross-cutting primitives (no UI, no features)
    errors/AppError.ts    typed error codes + message keys + retryability
    logging/logger.ts     namespaced logger, never prints stack traces to users
    config/env.ts         all environment-derived configuration
    http/httpClient.ts    fetch wrapper: timeout, retries, JSON validation
    storage/              AsyncStorage JSON documents (namespaced, versioned)
    cache/cache.ts        TTL cache with expiry + invalidation
    stats/watchStats.ts   pure reducers that derive statistics from watch data
    utils/                id, text, time, format, collections helpers
  data/models/            domain types (anime, progress, profile, banner, library,
                          achievements, settings, watchTogether)
  providers/              provider abstraction
    types.ts              AnimeProvider interface (search/getTitle/getEpisodes/
                          getAvailableVoiceovers/getStream/getAvailableQualities)
    manager.ts            registry + health + fallback + merged search
    health.ts             probe classification (unavailable, timeout, HTTP,
                          invalid JSON, missing fields/episode, stream, format)
    merge/                cross-provider deduplication and metadata merging
    implementations/      kodik, anime365, shikimori
  services/               orchestration between stores, providers and the cache
  store/                  persisted stores (zustand + custom persistence layer)
  theme/                  config-driven theme engine, 13 presets, effects engine,
                          card styles, navigation styles, backgrounds, custom themes
  i18n/                   string catalogue, runtime translation, user overrides
  ui/                     reusable design-system components
  features/               screens grouped by feature (home, search, details,
                          player, watchlists, profile, achievements, settings,
                          watchtogether)
  navigation/             tabs + stack + app shell (details modal, toasts)
```

## Layering rules

1. **UI never imports a concrete provider.** Screens call `src/services/*`
   (`providerService`, `playbackService`, `titleCache`), which talk to
   `ProviderManager`. Adding a source means adding one implementation file and
   registering it — no screen changes.
2. **Providers never import UI or stores.** They receive a title/episode and
   return normalised domain models, throwing `AppError` with a `messageKey`.
3. **Stores are the only mutable state.** Every store is created through
   `createPersistedStore`, debounces writes, versions its documents and
   self-heals when a document is unreadable.
4. **The theme is data, not code.** Screens read tokens from `useTheme()`; presets
   and user overrides are JSON. No screen contains a hard-coded colour decision.
5. **Strings are ids.** Components call `t('settings.title')`. The catalogue lives
   in `src/i18n/strings/{ru,en}.json` and can be overridden per language at runtime
   without touching images, layout or code.

## Persistence

`createPersistedStore` wraps a zustand store:

- namespaced storage keys (`storageKey(namespace)`)
- versioned documents with optional migrations
- debounced writes (250 ms) and explicit `flush()`/`hydrate()`/`reset()`
- `hydrateAllPersistedStores()` on start-up, `flushAllPersistedStores()` when the
  app goes to the background
- a corrupt or incompatible document falls back to defaults instead of throwing

Nothing is stored outside the device. There are no accounts, no analytics and no
secrets in the bundle (see `.env.example`).

## Error handling

- `AppError` carries a stable `code`; `messageKey` maps it to a translated string,
  so users never see a stack trace.
- `RETRYABLE` distinguishes transient failures (network, timeout, HTTP, invalid
  JSON, stream unavailable, provider unavailable, storage) from terminal ones
  (not found, missing episode, unsupported media, disabled provider, cache
  corrupted, permission denied).
- A React `ErrorBoundary` renders a themed fallback around the whole app.
- A failing provider degrades instead of crashing: the manager isolates failures,
  records them, and falls back to the next healthy source.

## Performance

- Lists use `FlatList`/`ScrollView` with horizontal lazy rows; discovery and
  search are paginated by the provider layer.
- Provider results are cached with TTLs; thumbnails are cached by `expo-image`.
- Timers are batched: Watch Together corrections run at 1 Hz, progress is
  persisted every 5 s, animations respect the "reduce motion" setting.
- Heavy derivations (statistics, achievement state) are pure functions memoised
  at the store boundary, never recomputed per render.

## Verification

`npm run verify` = `typecheck` + `lint` + `jest` + `expo export` for Android and
iOS. See `docs/TESTING.md` for the coverage map.
