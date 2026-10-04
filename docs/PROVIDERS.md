# Providers

AnimAlc talks to anime sources **only** through the provider abstraction
(`src/providers/types.ts`) and the provider manager (`src/providers/manager.ts`).
No screen imports a provider module, and no provider type leaks into the UI.

```
UI → providerService → ProviderManager → provider implementations → HTTP
                              ↕
                    merge / normalize / cache / health / fallback
```

## Active providers

| Provider | Registered | Public API | search | metadata | episodes | voiceovers | qualities | streams |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **AniLibria** (AniLiberty) | yes | yes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ HLS 480/720/1080 |
| **CVH** (CdnVideoHub) | no — link/id only | yes | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ HLS + MP4 ≤ 1080p |
| Kodik | yes | no — partner token | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ media URL — official embed player instead |
| Anime 365 (smotret-anime) | yes | yes | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (login-gated) |
| Shikimori | yes | yes | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

Retired and **removed from the codebase** during the Kodik migration: Anilibria
(API client, mapper, provider, tests, endpoints, env vars, strings) and
AniDUB/AniBoom. Only `src/services/providerMigration.ts` still mentions those
ids, to re-attach the user's local history (see *Data migration*).

## CVH (CdnVideoHub)

Open player API, no credentials — verified live on 2026-10-04:

* `GET https://plapi.cdnvideohub.com/api/v1/player/sv/playlist?pub=747&aggr=mali&id=<id>`
  → `{titleName, isSerial, items:[{cvhId, vkId, voiceStudio, voiceType, season, episode}]}`
* `GET …/video/<vkId>` → `{duration, thumbUrl, sources:{hlsUrl, dashUrl,
  mpegHighUrl (720), mpegFullHdUrl (1080), mpegMediumUrl (480), mpegLowUrl (360),
  mpegLowestUrl (240), mpegTinyUrl (144)}}` — Odnoklassniki key naming, mapped by
  `CVH_QUALITY_HEIGHTS`.

**There is no title search** — probed live: `GET …/player/sv/search?query=naruto`
answers `404 page not found`. Discovery instead comes from a source that
publishes CVH links: AniLibria's `external_player` (see below). When that field
holds a `/cdn-iframe/<id>/…` url, the mapper reuses the id as a CVH
`providerRef`, so a title found by AniLibria search is played natively through
CVH's open API — episodes, dubs, qualities and HLS, no scraping involved.
A pasted link or `cvh:<id>` still works on its own: the search screen detects it
and shows an explicit *Open in the CVH player* action.

The playlist holds every episode once per dub, so the episode list keeps one
entry per episode and the dubs live behind the voiceover switch
(`getAvailableVoiceovers()` + `voiceoverId` on `getStream()`); a dub missing for
a given episode falls back to one that exists instead of failing playback. A media item is addressed by the publisher's id,
which lives on the site embedding the player; discovering ids by name would mean
scraping that site, which AnimAlc does not do. Instead `parseCvhReference()`
accepts what a user can paste — a `/cdn-iframe/<id>/<season>/<episode>?dubbing=…`
url, a bare numeric id, or `cvh:<id>` — and `searchTitles()` resolves it
directly, so pasting a CVH link in the search field plays it.

CDN links are signed, IP-bound and short-lived, so they are fetched right
before playback and the resulting bundle carries an `expiresAt` (~3 min).

## AniLibria (AniLiberty)

Public API, no credentials: catalogue, search, episodes with Russian voiceover,
HLS 480/720/1080 and opening/ending timecodes. It is the source that makes the
native player work without any token.

**`external_player` makes unhosted releases playable.** AniLibria publishes an
official embed link for the releases it does not host itself — captured live on
2026-10-04: `"external_player": "//aniqit.com/serial/47963/bc6d1015…/720p?translations=false"`.
AnimAlc plays that link inside the provider's own player (the same web view as
Kodik) and never derives a media URL from it. When the link points at
CdnVideoHub, the title gets a CVH provider ref instead and plays natively.

**Filters are applied client-side.** A live call to
`/anime/catalog/releases` on 2026-10-04 returned the same first release and the
same `pagination.total` (1934) with and without `genres`, `years`,
`is_ongoing`, `ordering`, `type` and `types` — the endpoint only honours `limit`
and `page`. `src/providers/searchFilters.ts` therefore narrows every page in the
app, so the format (ТВ / Фильм / OVA / ONA / Спешл), year, status, genre and
minimum-episode filters really do filter. AniLiberty publishes no separate
"Blu-Ray" flag: the closest real signals are the release format and the
available HLS renditions (1080p), and that is what the UI offers.

## Kodik

* Base URL `https://kodik-api.com` (`EXPO_PUBLIC_KODIK_BASE_URL`).
* Authentication: partner **token** passed as the `token` query parameter.
  Verified live: a missing/invalid token answers
  `{"error":"Отсутствует или неверный токен"}` — the app maps that to
  `AUTHENTICATION_REQUIRED`, never to a generic failure.
* Endpoints used (all GET, JSON envelope `{time,total,results[],next_page}`):
  * `/search` — by `title`, `id`, `shikimori_id`, `kinopoisk_id`, `imdb_id`,
    `mdl_id`; filters `types`, `year`, `anime_kind`, `anime_status`,
    `anime_genres`, `translation_id`, `translation_type`, `limit` (≤ 100).
  * `/list` — catalogue/discovery (`sort`, `order`, cursor `next_page`).
  * `/search?id=…&with_episodes=true&with_episodes_data=true` — seasons →
    episodes, each with the official embed player link.
  * `/search?id=…&limit=100` — one result per translation, which is how the
    voiceover list for a material is derived.
  * `/get-player` — `{found, allowed, quality, translation, link}`: the
    documented way to ask Kodik for a title's player link (`title`, `ID`, `url`,
    `hasPlayer`).
  * `/genres` — the documented genre catalogue (`getGenres()`), proxied
    together with the other reference endpoints `/countries`, `/years`,
    `/translations/v2` and `/qualities/v2`.
* Response fields mapped: `id`, `type`, `link`, `title`, `title_orig`,
  `other_title`, `translation{id,title,type}`, `year`, `last_season`,
  `last_episode`, `episodes_count`, `shikimori_id`, `quality`, `screenshots`,
  `seasons{}`, `material_data{description,genres,anime_kind,anime_status,duration,rating_mpaa,poster,anime_studios}`.
  Fields Kodik does not publish (score, votes) stay `undefined` — they are never
  invented.
* **Playback:** Kodik's documented API returns an embed player link
  (`//kodik.info/serial/{id}/{hash}/720p`), never a media URL. AnimAlc plays it
  the way Kodik intends — inside the provider's own player
  (`EmbedPlayerScreen`, `react-native-webview`), reachable from the player
  screen through *Open in the source player*. The link comes from the episode
  (`with_episodes`) or from `/get-player`.
* `getStream()` still throws `STREAM_UNAVAILABLE` for Kodik: the direct HLS
  manifests are produced by the player's obfuscated internal endpoint, which
  AnimAlc does not call. The native player keeps serving sources that publish
  real HLS/MP4 URLs. Nothing is bypassed, and nothing is faked.
* Qualities are derived from the real `quality` label (`WEB-DLRip 720p` → 720p)
  and the player link suffix — not from a hardcoded list.

### What is deliberately *not* implemented

Third-party wrappers such as `kodikwrapper` split their surface in two, and the
split matters:

* `Client` implements "только публичное api" — the documented endpoints listed
  above. AnimAlc follows exactly that surface (including `/get-player` and the
  reference catalogues).
* `VideoLinks.getLinks()` / `getActualVideoInfoEndpoint()` / `getPublicToken()`
  reach the direct `cloud.kodik-storage.com` manifests by parsing the player
  page, reading its JS chunk and calling an internal endpoint that Kodik
  rotates on purpose (their own docs: "kodik начал часто менять endpoint";
  example `playerDomain: 'kodikplayer.com'`, `videoInfoEndpoint: '/ftor'`),
  plus harvesting a token out of Kodik's player script.

That is circumventing a technical protection measure, not using an API, so
AnimAlc does not do it — the rotation and obfuscation *are* the access control.
If Kodik ever exposes media URLs through the documented API, `getStream()` is
the single place that would implement them.

### Keeping the token out of the app

`server/kodik-gateway.mjs` is the supported production layout:

```
KODIK_API_TOKEN=… npm run server:kodik      # PORT 8790, HOST 0.0.0.0
EXPO_PUBLIC_KODIK_GATEWAY_URL=https://gateway.example.invalid
```

The gateway is deliberately narrow:

* routes: `/health`, `/search`, `/list`, `/material?id=`, `/translations?id=`,
  `/get-player`, and the reference catalogues `/genres`, `/countries`, `/years`,
  `/translations/v2`, `/qualities/v2`; everything else is a 404 — it is not an
  open proxy;
* query parameters are whitelisted per route and validated (`limit` ≤ 100,
  `with_*` coerced to booleans, oversize values dropped, client `token`
  ignored);
* the token is injected server-side and never appears in a response;
* per-client rate limiting (`RATE_LIMIT_PER_MIN`, default 30);
* upstream failures are mapped to `401 AUTHENTICATION_REQUIRED`,
  `429 RATE_LIMITED`, `404 NOT_FOUND`, `502 UPSTREAM_ERROR`, `504 TIMEOUT`;
* without `KODIK_API_TOKEN` every data route answers
  `503 AUTHENTICATION_REQUIRED` and `/health` reports `configured: false`.

`EXPO_PUBLIC_KODIK_TOKEN` exists for local development only. A token baked into
a shipped bundle is public, so production always uses the gateway.

When neither a token nor a gateway is configured the descriptor's
`isConfigured()` returns `false`, the manager disables Kodik, and Settings →
Sources shows `providers.kodik.requiresToken` instead of a source that can only
fail.

## Environment variables

| Variable | Meaning |
| --- | --- |
| `EXPO_PUBLIC_KODIK_GATEWAY_URL` | AnimAlc Kodik gateway (recommended) |
| `EXPO_PUBLIC_KODIK_BASE_URL` | direct Kodik API base, default `https://kodik-api.com` |
| `EXPO_PUBLIC_KODIK_TOKEN` | dev-only partner token — never ship it |
| `EXPO_PUBLIC_ANIME365_BASE_URL` | default `https://smotret-anime.online/api` |
| `EXPO_PUBLIC_SHIKIMORI_BASE_URL` | default `https://shikimori.io/api` |
| `KODIK_API_TOKEN` | server-side token for the gateway |

## Errors

Every provider failure becomes an `AppError` with a stable code
(`src/core/errors/AppError.ts`): `NETWORK_UNAVAILABLE`, `TIMEOUT`,
`AUTHENTICATION_REQUIRED`, `RATE_LIMITED`, `HTTP_ERROR`, `INVALID_JSON`,
`INVALID_PAYLOAD`, `NOT_FOUND`, `MISSING_EPISODE`, `STREAM_UNAVAILABLE`,
`UNSUPPORTED_MEDIA`, `PROVIDER_UNAVAILABLE`, `PROVIDER_DISABLED`. The UI renders
`errors.<code>` strings, never a stack trace. A failing provider is recorded as
a search failure and the manager continues with the healthy ones — one dead
source never blanks the screen or crashes the app.

## Caching

`src/services/titleCache.ts` persists normalised data with TTLs from
`CacheTtl`: search 5 min, titles 6 h, episodes 30 min, voiceovers 30 min,
genres 24 h. Manager health records live for 2 min. **Stream URLs are never
cached** — Kodik does not publish any, and providers that do are re-resolved per
playback so expiring links are not replayed.

## Data migration

Watch history stores `providerId`/`titleId`. Entries that point at a retired
provider are re-attached by title on first launch after the migration
(`migrateRetiredProviders`); when no match is found the entry is **kept** and
tagged `legacyProviderId`. Nothing is deleted because a source went away.

## Live audit

```
npm run providers:check                       # all providers
npm run providers:check -- --provider kodik --query "Наруто"
```

The script reports what each endpoint actually returned, including credential
errors, and never substitutes fake data.
