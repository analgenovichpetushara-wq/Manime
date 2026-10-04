import { mapEpisode, mapQualities, mapRelease, mapStreams, mapVoiceover, proxyImage } from '@/providers/implementations/anilibria/mapper';
import { AnilibriaApi, apiOrigin, absoluteMediaUrl } from '@/providers/implementations/anilibria/api';
import { anilibriaEpisode, anilibriaEpisodeWithoutStreams, anilibriaRelease } from './fixtures/releases';
import { AppError } from '@/core/errors/AppError';
import { AnilibriaProvider } from '@/providers/implementations/anilibria/provider';
import { applyFilters, matchesFilters } from '@/providers/searchFilters';
import { createProviderManager } from '@/providers/registry';
import { cvhPlaylist, cvhVideo } from './fixtures/cvh';
import { EMPTY_FILTERS } from '@/data/models/anime';

describe('Anilibria provider mapping', () => {
  it('maps a release into the normalized title model', () => {
    const title = mapRelease(anilibriaRelease as never);
    expect(title.id).toBe('anilibria:16605');
    expect(title.title).toBe('Тестовый релиз');
    expect(title.titleEn).toBe('Test Release');
    expect(title.genres).toEqual(['Фэнтези', 'Приключения']);
    expect(title.episodesTotal).toBe(12);
    expect(title.averageEpisodeDurationSec).toBe(1440);
    expect(title.status).toBe('released');
    expect(title.type).toBe('TV');
    expect(title.poster).toContain('https://');
    expect(title.isMature).toBe(false);
    expect(title.hasRussianVoice).toBe(true);
    expect(title.capabilities.streams).toBe(true);
    expect(title.providerRefs).toEqual([{ providerId: 'anilibria', refId: '16605' }]);
  });

  it('flags mature releases without stripping their metadata', () => {
    const mature = mapRelease({ ...anilibriaRelease, age_rating: { value: '18', label: '18+', is_adult: true } } as never);
    expect(mature.isMature).toBe(true);
    expect(mature.ageRating).toBe('18+');
    expect(mature.genres.length).toBeGreaterThan(0);
  });

  it('maps episodes with intro/outro skip windows and availability', () => {
    const episode = mapEpisode(16605, anilibriaEpisode as never);
    expect(episode.ordinal).toBe(1);
    expect(episode.introSkip).toEqual({ start: 12, end: 102 });
    expect(episode.outroSkip).toEqual({ start: 1320, end: 1420 });
    expect(episode.isAvailable).toBe(true);
    expect(episode.durationSec).toBe(1440);

    const blocked = mapEpisode(16605, anilibriaEpisodeWithoutStreams as never);
    expect(blocked.isAvailable).toBe(false);
  });

  it('builds HLS sources ordered by quality and marks the default', () => {
    const episode = mapEpisode(16605, anilibriaEpisode as never);
    const sources = mapStreams(16605, anilibriaEpisode as never, episode);
    expect(sources).toHaveLength(3);
    expect(sources.every((source) => source.kind === 'hls')).toBe(true);
    expect(sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    expect(sources.filter((source) => source.isDefault)).toHaveLength(1);

    const qualities = mapQualities(sources);
    expect(qualities.map((quality) => quality.height)).toEqual([1080, 720, 480]);
  });

  it('returns no sources when the provider exposes none (never fakes a stream)', () => {
    const episode = mapEpisode(16605, anilibriaEpisodeWithoutStreams as never);
    expect(mapStreams(16605, anilibriaEpisodeWithoutStreams as never, episode)).toEqual([]);
  });

  it('maps the release voiceover with its members', () => {
    const voiceover = mapVoiceover(anilibriaRelease as never);
    expect(voiceover.kind).toBe('voice');
    expect(voiceover.language).toBe('ru');
    expect(voiceover.authors).toContain('AnimAlc Team');
  });

  it('resolves relative media paths against the API origin and keeps absolute urls', () => {
    expect(proxyImage('/storage/a.jpg')).toContain('/storage/a.jpg');
    expect(absoluteMediaUrl('/storage/a.jpg')).toBe(`${apiOrigin()}/storage/a.jpg`);
    expect(absoluteMediaUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(absoluteMediaUrl(undefined)).toBeUndefined();
  });

  it('uses an AppError with a stable code for malformed releases', () => {
    const error = new AppError({ code: 'INVALID_PAYLOAD', providerId: 'anilibria', message: 'bad payload' });
    expect(error.messageKey).toBe('errors.invalid_payload');
    expect(error.retryable).toBe(true);

    const missing = new AppError({ code: 'NOT_FOUND', providerId: 'anilibria', message: 'gone' });
    expect(missing.retryable).toBe(false);
    expect(missing.messageKey).toBe('errors.not_found');
  });
});

describe('search filters (applied client-side)', () => {
  const movieRelease = {
    ...anilibriaRelease,
    id: 16606,
    type: { value: 'MOVIE', description: 'Фильм' },
    name: { main: 'Фильм-релиз', english: 'Movie Release', alternative: null },
    episodes_total: 1,
  };

  function installSearchStub(payload: unknown): string[] {
    const requested: string[] = [];
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      requested.push(url);
      return {
        ok: true,
        status: 200,
        url,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
        headers: new Map(),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    return requested;
  }

  it('narrows results by format, year, status and episode count', async () => {
    installSearchStub([anilibriaRelease, movieRelease]);
    const provider = new AnilibriaProvider(new AnilibriaApi());

    const unfiltered = await provider.search('релиз', EMPTY_FILTERS, 1);
    expect(unfiltered.items.map((title) => title.type)).toEqual(['TV', 'MOVIE']);

    const movies = await provider.search('релиз', { ...EMPTY_FILTERS, types: ['MOVIE'] }, 1);
    expect(movies.items.map((title) => title.id)).toEqual(['anilibria:16606']);

    const tooLong = await provider.search('релиз', { ...EMPTY_FILTERS, minEpisodes: 6 }, 1);
    expect(tooLong.items.map((title) => title.id)).toEqual(['anilibria:16605']);
  });

  it('matches a title against every filter axis', () => {
    const title = mapRelease(anilibriaRelease as never);
    expect(matchesFilters(title, EMPTY_FILTERS)).toBe(true);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, types: ['MOVIE'] })).toBe(false);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, types: ['TV'] })).toBe(true);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, years: [2024] })).toBe(true);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, years: [1999] })).toBe(false);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, statuses: ['ongoing'] })).toBe(false);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, genres: ['фэнтези'] })).toBe(true);
    expect(matchesFilters(title, { ...EMPTY_FILTERS, genres: ['Меха'] })).toBe(false);
  });

  it('leaves a page untouched when no filter is set', () => {
    const items = [mapRelease(anilibriaRelease as never)];
    expect(applyFilters(items, EMPTY_FILTERS)).toBe(items);
    expect(applyFilters(items, { ...EMPTY_FILTERS, types: ['OVA'] })).toEqual([]);
  });
});

describe('external player links published by AniLibria', () => {
  function stubJson(payload: unknown): void {
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      return {
        ok: true,
        status: 200,
        url,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
        headers: new Map(),
      } as unknown as Response;
    }) as unknown as typeof fetch;
  }

  const cvhExternal = {
    ...anilibriaRelease,
    id: 16607,
    external_player: '//animego.org/anime/1234/cdn-iframe/51019/1/2?dubbing=AniLibria',
  };

  it('absolutizes an embed link without turning it into a stream', () => {
    const title = mapRelease({
      ...anilibriaRelease,
      external_player: '//aniqit.com/serial/47963/bc6d1015fa55949863a13500100c56d8/720p?translations=false',
    } as never);
    expect(title.externalPlayerUrl).toBe(
      'https://aniqit.com/serial/47963/bc6d1015fa55949863a13500100c56d8/720p?translations=false',
    );
    // A player page is not a media url: no CVH ref is invented from it.
    expect(title.providerRefs).toEqual([{ providerId: 'anilibria', refId: '16605' }]);
  });

  it('reuses a CdnVideoHub link as a CVH ref so the title plays natively', () => {
    const title = mapRelease(cvhExternal as never);
    expect(title.providerRefs).toEqual([
      { providerId: 'anilibria', refId: '16607' },
      { providerId: 'cvh', refId: '51019' },
    ]);
    expect(title.externalPlayerUrl).toContain('https://animego.org/');
  });

  it('resolves the embed link from the release payload', async () => {
    stubJson({ ...anilibriaRelease, external_player: '//aniqit.com/serial/47963/hash/720p' });
    const provider = new AnilibriaProvider(new AnilibriaApi());
    const title = mapRelease(anilibriaRelease as never);
    await expect(provider.getEmbedLink(title)).resolves.toBe('https://aniqit.com/serial/47963/hash/720p');
  });

  it('plays a searched title through CVH when AniLibria points at it', async () => {
    const routes: { match: (url: string) => boolean; body: unknown }[] = [
      { match: (url) => url.includes('/app/search/releases'), body: [cvhExternal] },
      { match: (url) => url.includes('/anime/releases/'), body: { ...cvhExternal, episodes: [] } },
      { match: (url) => url.includes('/player/sv/playlist'), body: cvhPlaylist },
      { match: (url) => url.includes('/player/sv/video/'), body: cvhVideo },
    ];
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const route = routes.find((candidate) => candidate.match(url));
      if (!route) throw new TypeError(`no route for ${url}`);
      return {
        ok: true,
        status: 200,
        url,
        text: async () => JSON.stringify(route.body),
        json: async () => route.body,
        headers: new Map(),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const manager = createProviderManager();
    const found = await manager.search({ ...EMPTY_FILTERS, query: 'релиз' }, 1);
    const title = found.items.find((item) => item.id === 'anilibria:16607');
    expect(title?.providerRefs.map((ref) => ref.providerId)).toContain('cvh');

    const { episodes, providerId } = await manager.getEpisodes(title!);
    expect(providerId).toBe('cvh');
    const bundle = await manager.getStream(title!, episodes[0]!);
    expect(bundle.providerId).toBe('cvh');
    expect(bundle.sources.some((source) => source.kind === 'hls')).toBe(true);
  });
});
