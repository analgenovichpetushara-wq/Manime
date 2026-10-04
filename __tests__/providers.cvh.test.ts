import { CvhApi, parseCvhReference } from '@/providers/implementations/cvh/api';
import { mapEpisodes, mapQualities, mapStreams, mapTitle, mapVoiceovers, selectVideoId, voiceoverRefId } from '@/providers/implementations/cvh/mapper';
import { CvhProvider } from '@/providers/implementations/cvh/provider';
import { createProviderManager } from '@/providers/registry';
import { cvhPlaylist, cvhVideo } from './fixtures/cvh';

interface StubRoute {
  match: (url: string) => boolean;
  body: unknown;
  status?: number;
  throwNetwork?: boolean;
}

function installStub(routes: StubRoute[]): string[] {
  const requested: string[] = [];
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    requested.push(url);
    const route = routes.find((candidate) => candidate.match(url));
    if (!route) throw new TypeError(`no route for ${url}`);
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

describe('CVH reference parsing', () => {
  it('reads an iframe url, a bare id and a cvh: reference', () => {
    expect(parseCvhReference('https://animego.org/anime/1234/season/5/episode/7/cdn-iframe/51019/1/2?dubbing=AniLibria')).toEqual({
      id: '51019',
      season: 1,
      episode: 2,
      studio: 'AniLibria',
    });
    expect(parseCvhReference('https://cdnvideohub.com/cdn-iframe/51019/AniDub%20Online/3/4')).toMatchObject({
      id: '51019',
      season: 3,
      episode: 4,
      studio: 'AniDub Online',
    });
    expect(parseCvhReference('  51019  ')).toEqual({ id: '51019' });
    expect(parseCvhReference('cvh:51019')).toEqual({ id: '51019' });
  });

  it('refuses anything that is not a CVH reference', () => {
    expect(parseCvhReference('наруто')).toBeUndefined();
    expect(parseCvhReference('https://kodik.info/serial/42758/hash/720p')).toBeUndefined();
    expect(parseCvhReference('')).toBeUndefined();
  });
});

describe('CVH mapping (captured payloads)', () => {
  const items = cvhPlaylist.items ?? [];

  it('maps the playlist title and its episodes without inventing fields', () => {
    const title = mapTitle('51019', cvhPlaylist.titleName ?? undefined, cvhPlaylist.isSerial ?? undefined, items);
    expect(title.id).toBe('cvh:51019');
    expect(title.title).toBe('Истребитель демонов: Собрание высших лун и деревня кузнецов');
    expect(title.type).toBe('TV');
    expect(title.episodesTotal).toBe(2);
    expect(title.capabilities.streams).toBe(true);
    expect(title.providerRefs).toEqual([{ providerId: 'cvh', refId: '51019' }]);

    const episodes = mapEpisodes(title.id, items);
    // One entry per episode: the three dubs of episode 1 collapse into one.
    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toMatchObject({
      id: 'cvh:10417869052469',
      ordinal: 1,
      providerId: 'cvh',
      refId: '10417869052469',
      isAvailable: true,
      voiceoverRefId: 'cvh:voice:anidub-online',
    });
  });

  it('lists each episode once and keeps the dubs behind the voiceover switch', () => {
    const episodes = mapEpisodes('cvh:51019', items);
    // Five playlist entries = two episodes in three and two dubs.
    expect(episodes.map((episode) => episode.ordinal)).toEqual([1, 2]);
    expect(selectVideoId(items, 1)).toBe('10417869052469');
    expect(selectVideoId(items, 1, 'cvh:voice:anilibriatv')).toBe('7043868678752');
    // A dub that is missing for this episode falls back to one that exists
    // instead of failing playback outright.
    expect(selectVideoId(items, 2, 'cvh:voice:dream-cast')).toBe('10417890023989');
    expect(selectVideoId(items, 99)).toBeUndefined();
  });

  it('derives one voiceover per studio and keeps subtitles distinct', () => {
    const voiceovers = mapVoiceovers('cvh:51019', items);
    expect(voiceovers.map((voiceover) => voiceover.name)).toEqual(['AniDub Online', 'AnilibriaTV', 'Dream Cast']);
    expect(voiceovers[0]?.kind).toBe('dub');
    expect(voiceoverRefId('AnilibriaTV')).toBe('cvh:voice:anilibriatv');
  });

  it('maps the Odnoklassniki source keys onto real qualities', () => {
    const episode = mapEpisodes('cvh:51019', items)[0]!;
    const sources = mapStreams('cvh:51019', episode, cvhVideo);
    const hls = sources.find((source) => source.kind === 'hls');
    expect(hls?.isDefault).toBe(true);
    expect(hls?.url).toContain('video.m3u8');

    const heights = sources.filter((source) => source.kind === 'mp4').map((source) => source.height);
    expect(heights).toEqual([1080, 720, 480, 360, 240, 144]);
    // Empty strings from the API never become sources.
    expect(sources.some((source) => source.label === '1440p')).toBe(false);

    const qualities = mapQualities(sources);
    expect(qualities.map((quality) => quality.label)).toContain('720p');
  });
});

describe('CVH provider', () => {
  it('resolves a playlist through the registry and streams it', async () => {
    const requested = installStub([
      { match: (url) => url.includes('/playlist'), body: cvhPlaylist },
      { match: (url) => url.includes('/video/'), body: cvhVideo },
    ]);
    const manager = createProviderManager();

    const title = await manager.getTitle('cvh', '51019');
    expect(title.title).toContain('Истребитель демонов');
    expect(requested[0]).toContain('/playlist?');
    expect(requested[0]).toContain('pub=747');
    expect(requested[0]).toContain('aggr=mali');
    expect(requested[0]).toContain('id=51019');

    const { episodes } = await manager.getEpisodes(title);
    const bundle = await manager.getStream(title, episodes[0]!, { preferredProviderId: 'cvh' });
    expect(bundle.providerId).toBe('cvh');
    expect(bundle.sources.length).toBeGreaterThan(1);
    // Signed CDN links expire quickly, so the bundle says when.
    expect(bundle.expiresAt).toBeGreaterThan(Date.now());
  });

  it('streams the dub the user picked', async () => {
    const requested = installStub([
      { match: (url) => url.includes('/playlist'), body: cvhPlaylist },
      { match: (url) => url.includes('/video/'), body: cvhVideo },
    ]);
    const manager = createProviderManager();
    const title = await manager.getTitle('cvh', '51019');
    const { episodes } = await manager.getEpisodes(title);

    await manager.getStream(title, episodes[0]!, { voiceoverId: 'cvh:voice:anilibriatv' });
    expect(requested.some((url) => url.includes('/video/7043868678752'))).toBe(true);
  });

  it('never pretends to search and reports stream failures honestly', async () => {
    const provider = new CvhProvider(new CvhApi());
    await expect(provider.search()).rejects.toMatchObject({ code: 'NOT_FOUND', providerId: 'cvh' });
    await expect(provider.discover()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(provider.getGenres()).resolves.toEqual([]);
    expect(provider.descriptor.capabilities.search).toBe(false);

    installStub([
      { match: (url) => url.includes('/playlist'), body: cvhPlaylist },
      { match: (url) => url.includes('/video/'), body: { sources: {} } },
    ]);
    const manager = createProviderManager();
    const title = await manager.getTitle('cvh', '51019');
    const { episodes } = await manager.getEpisodes(title);
    await expect(manager.getStream(title, episodes[0]!, { preferredProviderId: 'cvh' })).rejects.toMatchObject({
      code: 'STREAM_UNAVAILABLE',
    });
  });

  it('treats an answered-but-empty playlist as a healthy API and a network failure as down', async () => {
    installStub([{ match: (url) => url.includes('/playlist'), body: { items: [] } }]);
    const provider = new CvhProvider(new CvhApi());
    await expect(provider.healthCheck()).resolves.toMatchObject({ status: 'healthy', providerId: 'cvh' });

    installStub([{ match: (url) => url.includes('/playlist'), body: {}, throwNetwork: true }]);
    const failing = await new CvhProvider(new CvhApi()).healthCheck();
    expect(failing.status).toBe('down');
  });
});
