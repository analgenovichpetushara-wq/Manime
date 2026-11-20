import { MemoryStorage, setActiveStorage } from '@/core/storage/storage';
import { bestMatch, extractPart, matchTargetOf, normalizeTitle, scoreCandidate } from '@/providers/matching/titleMatch';
import { AnilibriaApi } from '@/providers/implementations/anilibria/api';
import { CvhProvider } from '@/providers/implementations/cvh/provider';
import { mapEpisodes, mapQualities, mapStreams } from '@/providers/implementations/cvh/mapper';
import { attachCvhReference, asCvhTitle, clearCvhCache, detachCvhReference, resolveCvhId } from '@/services/cvhLinkService';
import { cvhMappingStore } from '@/store/cvhMappingStore';
import { anilibriaRelease } from './fixtures/releases';
import { cvhPlaylist, cvhVideo } from './fixtures/cvh';
import type { AnimeTitle } from '@/data/models/anime';

function title(overrides: Partial<AnimeTitle> = {}): AnimeTitle {
  return {
    id: 'shikimori:20',
    providerId: 'shikimori',
    refId: '20',
    title: 'Наруто [ТВ-1]',
    titleEn: 'Naruto',
    alternativeTitles: ['Naruto', 'ナルト'],
    genres: [],
    tags: [],
    status: 'released',
    type: 'TV',
    year: 2002,
    isMature: false,
    hasRussianVoice: true,
    providerRefs: [{ providerId: 'shikimori', refId: '20' }],
    capabilities: {
      search: false,
      metadata: true,
      episodes: false,
      streams: false,
      voiceovers: false,
      qualities: false,
      schedule: false,
      publicApi: true,
    },
    ...overrides,
  };
}

class StubAnilibriaApi extends AnilibriaApi {
  constructor(private readonly releases: unknown[], private readonly shouldThrow = false) {
    super({ baseUrl: 'https://api.anilibria.app/api/v1' });
  }

  override async search(): Promise<never[]> {
    if (this.shouldThrow) throw new TypeError('Network request failed');
    return this.releases as never[];
  }
}

/** Shikimori double: search answers with the given ids and names. */
function stubShikimori(items: AnimeTitle[]) {
  return { search: async () => ({ items, page: 1, hasMore: false }) };
}

/** A playlist title as the CVH API reports it. */
function stubPlaylist(titleName: string | null) {
  return async () => titleName;
}

describe('title matching', () => {
  it('normalizes names and reads the season out of a title', () => {
    expect(normalizeTitle('  Судьба: Ночь  схватки! ')).toBe('судьба ночь схватки');
    expect(extractPart('Наруто [ТВ-2]')).toBe(2);
    expect(extractPart('Attack on Titan Season 3')).toBe(3);
    expect(extractPart('Наруто')).toBeUndefined();
  });

  it('matches the same release by any known name', () => {
    const target = matchTargetOf(title());
    const candidate = { title: title({ id: 'anilibria:1', providerId: 'anilibria', title: 'Naruto', titleEn: undefined }) };
    expect(scoreCandidate(target, candidate)).toBeGreaterThan(0.82);
    expect(bestMatch(target, [candidate])?.candidate.title.id).toBe('anilibria:1');
  });

  it('does not confuse another season, a film or an unrelated title', () => {
    const target = matchTargetOf(title());
    const secondSeason = { title: title({ id: 'a:2', title: 'Наруто [ТВ-2]', titleEn: 'Naruto Shippuuden', year: 2007, type: 'TV' }) };
    const movie = { title: title({ id: 'a:3', title: 'Наруто: Фильм', titleEn: 'Naruto the Movie', year: 2004, type: 'MOVIE' }) };
    const unrelated = { title: title({ id: 'a:4', title: 'Блич', titleEn: 'Bleach', year: 2004 }) };

    expect(bestMatch(target, [secondSeason, movie, unrelated])).toBeUndefined();
    expect(bestMatch(matchTargetOf(secondSeason.title), [secondSeason, movie, unrelated])?.candidate.title.id).toBe('a:2');
  });

  it('refuses to match when nothing is close enough', () => {
    expect(bestMatch(matchTargetOf(title()), [])).toBeUndefined();
    expect(bestMatch(matchTargetOf(title({ title: '', titleEn: undefined, alternativeTitles: [] })), [{ title: title() }])).toBeUndefined();
  });
});

describe('CdnVideoHub id resolution', () => {
  beforeEach(() => {
    setActiveStorage(new MemoryStorage());
    cvhMappingStore.store.setState({ entries: {} });
    clearCvhCache();
  });

  it('uses a mapping the user stored and rejects values that are not CVH references', () => {
    const subject = title();
    expect(attachCvhReference(subject, 'kodik.info/serial/1/hash/720p')).toBeNull();
    expect(attachCvhReference(subject, 'https://animego.org/anime/1/cdn-iframe/51019/1/2?dubbing=AniLibria')).toMatchObject({
      cvhId: '51019',
      origin: 'manual',
    });
  });

  it('prefers a stored mapping and then the refs the title already carries', async () => {
    const stored = title();
    attachCvhReference(stored, 'cvh:777');
    await expect(resolveCvhId(stored, { api: new StubAnilibriaApi([]) })).resolves.toMatchObject({ cvhId: '777', origin: 'manual' });

    const withRef = title({ id: 'anilibria:9', providerRefs: [{ providerId: 'anilibria', refId: '9' }, { providerId: 'cvh', refId: '51019' }] });
    await expect(resolveCvhId(withRef, { api: new StubAnilibriaApi([]) })).resolves.toMatchObject({ cvhId: '51019', origin: 'title' });
  });

  it('finds the id through an AniLibria release that points at CdnVideoHub', async () => {
    const api = new StubAnilibriaApi([
      {
        ...anilibriaRelease,
        id: 16605,
        name: { main: 'Наруто', english: 'Naruto', alternative: 'ナルト' },
        year: 2002,
        external_player: '//animego.org/anime/1234/cdn-iframe/51019/1/1?dubbing=AniLibria',
      },
    ]);
    const resolution = await resolveCvhId(title(), { api });
    expect(resolution).toMatchObject({ cvhId: '51019', origin: 'anilibria' });
    // The second call is served from the cache, without another request.
    await expect(resolveCvhId(title(), { api: new StubAnilibriaApi([], true) })).resolves.toMatchObject({ cvhId: '51019' });
  });

  it('reports no match instead of guessing, and survives a dead source', async () => {
    const noMatch = { api: new StubAnilibriaApi([{ ...anilibriaRelease, name: { main: 'Блич' } }]), playlistTitle: stubPlaylist(null) };
    await expect(resolveCvhId(title(), noMatch)).resolves.toBeNull();
    await expect(resolveCvhId(title(), { api: new StubAnilibriaApi([], true), playlistTitle: stubPlaylist(null) })).resolves.toBeNull();

    const subject = title();
    attachCvhReference(subject, 'cvh:51019');
    detachCvhReference(subject);
    await expect(resolveCvhId(subject, { lookup: false })).resolves.toBeNull();
  });

  it('accepts a Shikimori id only when the playlist behind it names the same release', async () => {
    // AniLibria reports no CVH player, so the id has to come from Shikimori.
    const api = new StubAnilibriaApi([{ ...anilibriaRelease, name: { main: 'Наруто' }, year: 2002, external_player: null }]);

    const wrongPlaylist = await resolveCvhId(title(), {
      api,
      playlistTitle: stubPlaylist('Блич'),
    });
    expect(wrongPlaylist).toBeNull();

    clearCvhCache();
    const rightPlaylist = await resolveCvhId(title(), {
      api,
      playlistTitle: stubPlaylist('Наруто'),
    });
    // 20 is the Shikimori ref the title carries.
    expect(rightPlaylist).toMatchObject({ cvhId: '20', origin: 'shikimori' });
    expect(cvhMappingStore.store.getState().entries['shikimori:20']?.cvhId).toBe('20');
  });

  it('searches Shikimori when the title carries no id of its own', async () => {
    const subject = title({ id: 'kodik:serial-42758', providerId: 'kodik', providerRefs: [{ providerId: 'kodik', refId: 'serial-42758' }] });
    const found = title({ id: 'shikimori:20', providerId: 'shikimori', refId: '20' });
    const resolution = await resolveCvhId(subject, {
      api: new StubAnilibriaApi([]),
      shikimori: stubShikimori([found]),
      playlistTitle: stubPlaylist('Naruto'),
    });
    expect(resolution).toMatchObject({ cvhId: '20', origin: 'shikimori' });
  });

  it('hands the player a title the CVH provider understands', async () => {
    const resolution = { cvhId: '51019', origin: 'manual' as const };
    const cvhTitle = asCvhTitle(title(), resolution);
    expect(cvhTitle.id).toBe('cvh:51019');
    expect(cvhTitle.providerRefs).toEqual([{ providerId: 'cvh', refId: '51019' }]);

    const requested: string[] = [];
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      requested.push(url);
      const body = url.includes('/playlist') ? cvhPlaylist : cvhVideo;
      return {
        ok: true,
        status: 200,
        url,
        text: async () => JSON.stringify(body),
        json: async () => body,
        headers: new Map(),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const provider = new CvhProvider();
    const episodes = await provider.getEpisodes(cvhTitle);
    expect(episodes.length).toBeGreaterThan(0);
    const bundle = await provider.getStream(cvhTitle, episodes[0]!);
    expect(bundle.sources.some((source) => source.kind === 'hls')).toBe(true);
    expect(requested[0]).toContain('id=51019');
  });
});

describe('release information', () => {
  it('never calls a rendition Blu-ray without the source saying so', () => {
    const episode = mapEpisodes('cvh:51019', cvhPlaylist.items ?? [])[0]!;
    const sources = mapStreams('cvh:51019', episode, cvhVideo);
    const qualities = mapQualities(sources);

    expect(qualities.length).toBeGreaterThan(1);
    expect(qualities.every((quality) => quality.release?.edition === 'UNKNOWN')).toBe(true);
    expect(qualities.find((quality) => quality.height === 1080)?.release).toMatchObject({
      edition: 'UNKNOWN',
      resolution: 1080,
      source: 'cdnvideohub',
    });
  });
});
