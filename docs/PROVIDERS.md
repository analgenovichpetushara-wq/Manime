# Providers

AnimAlc talks to public APIs only. It never bypasses authentication, DRM, access
controls, age gates or technical protection measures. Where an API requires
credentials, the provider is registered but disabled and the reason is shown in
**Settings → Providers**.

## Abstraction

```ts
interface AnimeProvider {
  readonly descriptor: ProviderDescriptor;      // id, title, base url, capabilities
  search(query, filters, page): Promise<Paged<AnimeTitle>>;
  getTitle(ref): Promise<AnimeTitle>;
  getEpisodes(title): Promise<Episode[]>;
  getAvailableVoiceovers(title): Promise<Voiceover[]>;
  getStream(request): Promise<StreamBundle>;
  getAvailableQualities(request): Promise<QualityVariant[]>;
  healthCheck(): Promise<ProviderHealth>;
}
```

`ProviderManager` owns registration, discovery, health, fallback, merged search
and selection:

- **Registration/discovery** — `registry.ts` exposes `availableProviders()`;
  a provider is used only when it is enabled and declares the capability.
- **Health** — every probe is classified as `healthy`, `degraded`, `down`,
  `disabled` or `unknown`. One failed probe degrades a source, three mark it down.
  Probes are cached for 120 s; `runHealthCheck(true)` forces a refresh.
- **Fallback** — `getStream` walks sources in order and returns the first playable
  bundle; if none succeed it throws `STREAM_UNAVAILABLE`, which the player turns
  into a translated error card with a retry button.
- **Result merging** — `merge/` normalises and deduplicates titles across sources
  (`isSameTitle`), keeping provider references so metadata, capabilities and
  voiceovers enrich one another instead of duplicating entries.

## Current sources

| Provider | Status | Search | Metadata | Episodes | Voiceovers | Streams | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AniLiberty (Anilibria) | enabled | yes | yes | yes | yes | HLS 480/720/1080 | primary catalogue, intros/outros timecodes |
| Anime365 (smotret-anime) | enabled | yes | yes | yes | yes | no | video links need a logged-in session, only metadata/voiceovers are used |
| Shikimori | enabled | yes | yes | no | no | no | Russian titles, genres, scores for enrichment |
| AniDUB / AniBoom | disabled | no | no | no | no | no | endpoint answers `401` without a personal bearer token — not bypassed |

Excluded after inspection: Anilibria v3 (dead), Sovetromantica (the domain no
longer serves the project), Jikan (upstream was unavailable during the check).

## Field normalisation

Each implementation has a mapper that turns the provider payload into the shared
domain model and fails loudly on malformed data:

- AniLiberty: quality keys map to `QualityVariant`, relative HLS urls are
  absolutised against the API host, `opening`/`ending` become `skipIntro`/`skipOutro`.
- Anime365: only `id` and `episodeFull` are public per episode; `duration` is in
  minutes and is converted to seconds.
- Shikimori: `shikimori.io` is used as the transport host; only metadata is read.
- AniDUB: throws `PROVIDER_DISABLED` in `search`/`getStream`, so it can never be
  selected for playback.

## Health failure taxonomy

`classifyHealth` / `AppError` cover the required cases: unavailable, timeout,
HTTP error, invalid JSON, invalid payload (missing required fields), missing
episode, unavailable stream and unsupported format.

## Live verification

```bash
npm run providers:check                      # probe every public endpoint
npm run providers:check -- --provider anilibria --query "магистр"
npm run providers:check -- --json > report.json
```

The script performs the same request chain the app does (search → metadata →
episodes → voiceovers → stream) and prints status, latency and item counts. It
reports sources that need credentials instead of attempting to bypass them.

## Adding a source

1. Create `src/providers/implementations/<id>/` with `provider.ts`, `types.ts`,
   `mapper.ts` and `__tests__`-style coverage in `__tests__/providers.<id>.test.ts`
   (see `__tests__/fixtures/releases.ts` for the fixture pattern).
2. Implement `AnimeProvider`, declare real capabilities and an honest
   `descriptor`.
3. Register it in `src/providers/registry.ts`.
4. Run `npm run typecheck && npm run test` and add an i18n entry for its
   description in both `ru.json` and `en.json`.
