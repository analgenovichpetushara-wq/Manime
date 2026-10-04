import { EMPTY_FILTERS } from '@/data/models/anime';
import { KodikApi } from '@/providers/implementations/kodik/api';
import {
  absolutizeLink,
  mapEpisodes,
  mapQualities,
  mapRelease,
  mapVoiceovers,
  parseQualityHeight,
} from '@/providers/implementations/kodik/mapper';
import { KodikProvider } from '@/providers/implementations/kodik/provider';
import { ProviderManager } from '@/providers/manager';
import { Anime365Provider } from '@/providers/implementations/anime365/provider';
import { ShikimoriProvider } from '@/providers/implementations/shikimori/provider';
import { PROVIDER_DESCRIPTORS, createProviderManager } from '@/providers/registry';
import { kodikMaterialWithEpisodes, kodikRelease, kodikReleaseVoiceover, kodikSearchResponse, kodikTokenError } from './fixtures/kodik';
import { a365Series, shikimoriAnime } from './fixtures/releases';

const CAPABILITIES = new KodikProvider().descriptor.capabilities;

interface StubRoute {
  match: (url: string) => boolean;
  body: unknown;
  status?: number;
  throwNetwork?: boolean;
  delayMs?: number;
}

function installStub(routes: StubRoute[]): Set<string> {
  const requested = new Set<string>();
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    requested.add(url);
    const route = routes.find((candidate) => candidate.match(url));
    if (!route) throw new TypeError(`no route for ${url}`);
    if (route.delayMs) await new Promise((resolve) => setTimeout(resolve, route.delayMs));
    if (route.throwNetwork) throw new TypeError('Network request failed');
    return {
      ok: (route.status ?? 200) < 400,
      status: route.status ?? 200,
      url,
      text: async () => JSON.stringify(route.body),
      json: async () => route.body,
      headers: new Map(),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return requested;
}

describe('Kodik mapping (captured payloads)', () => {
  it('maps a material onto the internal model without inventing fields', () => {
    const title = mapRelease(kodikMaterialWithEpisodes, CAPABILITIES);
    expect(title.id).toBe('kodik:serial-42758');
    expect(title.title).toBe('Наруто [ТВ-1]');
    expect(title.titleEn).toBe('Naruto');
    expect(title.alternativeTitles).toEqual(['Naruto', 'ナルト']);
    expect(title.year).toBe(2002);
    expect(title.type).toBe('TV');
    expect(title.status).toBe('released');
    expect(title.episodesTotal).toBe(220);
    expect(title.genres).toEqual(['Экшен', 'Приключения']);
    expect(title.synopsis).toBe('История о ниндзя из Конохи.');
    expect(title.ageRating).toBe('pg-13');
    expect(title.averageEpisodeDurationSec).toBe(1440);
    expect(title.poster).toBe('https://i.kodik.biz/posters/serial/42758.jpg');
    expect(title.providerRefs).toEqual([
      { providerId: 'kodik', refId: 'serial-42758' },
      { providerId: 'shikimori', refId: '20' },
    ]);
    // Kodik does not publish a score in the response — it must stay undefined.
    expect(title.rating).toBeUndefined();
  });

  it('flattens seasons into ordered episodes carrying the official player link', () => {
    const episodes = mapEpisodes(kodikMaterialWithEpisodes);
    expect(episodes.map((episode) => episode.ordinal)).toEqual([1, 2]);
    expect(episodes[0]?.name).toBe('Наруто Узумаки');
    expect(episodes[0]?.playerUrl).toBe('https://kodik.info/episode/1401678/3aoXdn0dc9e43d/720p');
    expect(episodes[0]?.refId).toBe('1:1');
    expect(episodes[0]?.isAvailable).toBe(true);
    expect(episodes[1]?.playerUrl).toContain('https://kodik.info/episode/1401679/');
  });

  it('lists the voiceovers Kodik reports and derives qualities from real labels', () => {
    const voiceovers = mapVoiceovers([kodikReleaseVoiceover, kodikRelease]);
    expect(voiceovers.map((voiceover) => voiceover.name)).toEqual(['LE-Production', 'Субтитры']);
    expect(voiceovers[0]?.kind).toBe('voice');
    expect(voiceovers[1]?.kind).toBe('subtitles');

    expect(mapQualities([kodikReleaseVoiceover, kodikRelease])).toEqual([
      { id: '720p', label: '720p', height: 720, kind: 'hls' },
    ]);
    expect(parseQualityHeight('WEB-DLRip 720p')).toBe(720);
    expect(parseQualityHeight('DVDRip')).toBeUndefined();
    expect(absolutizeLink('//kodik.info/x')).toBe('https://kodik.info/x');
    expect(absolutizeLink('javascript:alert(1)')).toBeUndefined();
  });
});

function createApi(): KodikApi {
  return new KodikApi({ baseUrl: 'https://kodik-api.com', token: 'test-partner-token' });
}

describe('Kodik provider', () => {
  const api = createApi();

  it('searches through /search and paginates client-side', async () => {
    const requested = installStub([
      { match: (url) => url.includes('/search'), body: kodikSearchResponse([kodikRelease], 1) },
    ]);
    const provider = new KodikProvider(api);
    const result = await provider.search('наруто', EMPTY_FILTERS, 1);
    expect(result.items[0]?.id).toBe('kodik:serial-42758');
    expect(result.totalItems).toBe(1);
    expect([...requested][0]).toContain('kodik-api.com/search?');
    expect([...requested][0]).toContain('title=%D0%BD%D0%B0%D1%80%D1%83%D1%82%D0%BE');
    expect([...requested][0]).toContain('types=anime%2Canime-serial');
  });

  it('resolves episodes and voiceovers through the documented parameters', async () => {
    const requested = installStub([
      { match: (url) => url.includes('with_episodes=true'), body: kodikSearchResponse([kodikMaterialWithEpisodes], 1) },
      { match: (url) => url.includes('/search'), body: kodikSearchResponse([kodikReleaseVoiceover, kodikRelease], 2) },
    ]);
    const provider = new KodikProvider(api);
    const title = mapRelease(kodikRelease, CAPABILITIES);

    const episodes = await provider.getEpisodes(title);
    expect(episodes).toHaveLength(2);
    expect([...requested].some((url) => url.includes('id=serial-42758'))).toBe(true);
    expect([...requested].some((url) => url.includes('with_episodes=true'))).toBe(true);

    const voiceovers = await provider.getAvailableVoiceovers(title);
    expect(voiceovers.map((voiceover) => voiceover.refId)).toEqual(['1062', '869']);

    const qualities = await provider.getAvailableQualities(title);
    expect(qualities[0]?.id).toBe('720p');
  });

  it('maps the live token error instead of surfacing raw provider text', async () => {
    installStub([{ match: (url) => url.includes('/search'), body: kodikTokenError, status: 401 }]);
    const provider = new KodikProvider(api);
    await expect(provider.search('naruto', EMPTY_FILTERS, 1)).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      providerId: 'kodik',
    });
  });

  it('reports rate limits, malformed payloads and network failures distinctly', async () => {
    const provider = new KodikProvider(api);

    installStub([{ match: (url) => url.includes('/search'), body: { error: 'Превышен лимит запросов' }, status: 429 }]);
    await expect(provider.search('naruto', EMPTY_FILTERS, 1)).rejects.toMatchObject({ code: 'RATE_LIMITED' });

    installStub([{ match: (url) => url.includes('/search'), body: { results: 'nope' } }]);
    await expect(provider.search('naruto', EMPTY_FILTERS, 1)).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });

    installStub([{ match: (url) => url.includes('/search'), body: {}, throwNetwork: true }]);
    await expect(provider.search('naruto', EMPTY_FILTERS, 1)).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' });

    installStub([{ match: (url) => url.includes('/search'), body: kodikSearchResponse([], 0) }]);
    await expect(provider.getTitle('serial-42758')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('resolves the official player link through /get-player and falls back to the material', async () => {
    const requested = installStub([
      { match: (url) => url.includes('/get-player'), body: { found: true, allowed: 1, quality: '720p', translation: 'LE-Production', link: '//kodik.info/serial/42758/bb173bb49a1d7bd2d8a7ca43c70a4082/720p' } },
      { match: (url) => url.includes('/search'), body: kodikSearchResponse([kodikRelease], 1) },
    ]);
    const provider = new KodikProvider(api);
    const title = mapRelease(kodikRelease, CAPABILITIES);

    await expect(provider.getEmbedLink(title)).resolves.toBe(
      'https://kodik.info/serial/42758/bb173bb49a1d7bd2d8a7ca43c70a4082/720p',
    );
    expect([...requested][0]).toContain('/get-player?');
    expect([...requested][0]).toContain('ID=serial-42758');

    // When /get-player finds nothing, the material's own link is used.
    installStub([
      { match: (url) => url.includes('/get-player'), body: { found: false, allowed: 0, link: null } },
      { match: (url) => url.includes('/search'), body: kodikSearchResponse([kodikRelease], 1) },
    ]);
    await expect(provider.getEmbedLink(title)).resolves.toBe(
      'https://kodik.info/serial/42758/bb173bb49a1d7bd2d8a7ca43c70a4082/720p',
    );
  });

  it('reads the genre catalogue from the documented /genres endpoint', async () => {
    const requested = installStub([
      {
        match: (url) => url.includes('/genres'),
        body: { time: '1ms', total: 2, results: [{ id: 1, title: 'Экшен' }, { id: 2, title: ' Драма ' }] },
      },
    ]);
    const provider = new KodikProvider(api);

    await expect(provider.getGenres()).resolves.toEqual(['Экшен', 'Драма']);
    expect([...requested][0]).toContain('/genres?');
  });

  it('refuses to invent a stream and reports the health probe honestly', async () => {
    installStub([{ match: (url) => url.includes('/list'), body: kodikSearchResponse([kodikRelease], 1) }]);
    const provider = new KodikProvider(api);
    await expect(provider.getStream()).rejects.toMatchObject({ code: 'STREAM_UNAVAILABLE', providerId: 'kodik' });
    expect(provider.descriptor.capabilities.streams).toBe(false);

    const healthy = await provider.healthCheck();
    expect(healthy.status).toBe('healthy');
    expect(healthy.details?.total).toBe(1);

    installStub([{ match: (url) => url.includes('/list'), body: kodikTokenError, status: 401 }]);
    const failing = await provider.healthCheck();
    expect(failing.status).toBe('down');
    expect(failing.errorCode).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe('provider stack after the migration', () => {
  it('ships AniLibria, CVH, Kodik, Anime365 and Shikimori', () => {
    expect(PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.id)).toEqual([
      'anilibria',
      'cvh',
      'kodik',
      'anime365',
      'shikimori',
    ]);
    expect(createProviderManager().list().map((provider) => provider.descriptor.id)).toEqual([
      'anilibria',
      'cvh',
      'kodik',
      'anime365',
      'shikimori',
    ]);
  });

  it('streams only from credential-free sources and never from Kodik', () => {
    // AniLibria publishes HLS and CVH answers openly; Kodik publishes no media
    // URL at all and stays on its official embed player.
    const streaming = PROVIDER_DESCRIPTORS.filter((descriptor) => descriptor.capabilities.streams);
    expect(streaming.map((descriptor) => descriptor.id)).toEqual(['anilibria', 'cvh']);
    expect(streaming.every((descriptor) => descriptor.capabilities.publicApi)).toBe(true);
    expect(PROVIDER_DESCRIPTORS.find((descriptor) => descriptor.id === 'kodik')?.capabilities.streams).toBe(false);
    // CVH has no catalogue, so it must not claim to search.
    expect(PROVIDER_DESCRIPTORS.find((descriptor) => descriptor.id === 'cvh')?.capabilities.search).toBe(false);
  });

  it('keeps returning merged results when Kodik is unauthenticated', async () => {
    installStub([
      { match: (url) => url.includes('kodik-api.com/search'), body: kodikTokenError, status: 401 },
      { match: (url) => url.includes('smotret-anime.online/api/series/'), body: { data: [a365Series] } },
      { match: (url) => url.includes('shikimori.io/api/animes'), body: [shikimoriAnime] },
    ]);
    const manager = new ProviderManager();
    manager.register(new KodikProvider(createApi()));
    manager.register(new Anime365Provider());
    manager.register(new ShikimoriProvider());

    const result = await manager.search({ ...EMPTY_FILTERS, query: 'наруто' }, 1);
    expect(result.failures).toEqual([
      expect.objectContaining({ providerId: 'kodik', errorCode: 'AUTHENTICATION_REQUIRED' }),
    ]);
    expect(result.items.map((item) => item.providerId)).toContain('anime365');
    expect(result.items.map((item) => item.providerId)).toContain('shikimori');
    expect(manager.getHealth('kodik')[0]?.errorCode).toBe('AUTHENTICATION_REQUIRED');
  });
});
