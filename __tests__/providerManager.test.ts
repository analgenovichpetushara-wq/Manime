import type { AnimeTitle, Episode, Paged, QualityVariant, SearchFilters, StreamBundle, Voiceover } from '@/data/models/anime';
import { EMPTY_FILTERS, NO_CAPABILITIES, titleKey } from '@/data/models/anime';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';
import { ProviderManager } from '@/providers/manager';
import { isSameTitle, mergeProviderRefs } from '@/providers/merge/normalizeTitle';

function makeTitle(providerId: string, refId: string, overrides: Partial<AnimeTitle> = {}): AnimeTitle {
  return {
    id: titleKey(providerId, refId),
    providerId,
    refId,
    title: 'Тестовый релиз',
    alternativeTitles: ['Test Release'],
    genres: ['Фэнтези'],
    tags: [],
    status: 'released',
    type: 'TV',
    isMature: false,
    hasRussianVoice: providerId === 'stream-a',
    providerRefs: [{ providerId, refId }],
    capabilities: { ...NO_CAPABILITIES, search: true, metadata: true },
    ...overrides,
  };
}

interface FakeOptions {
  id: string;
  capabilities?: Partial<AnimeTitle['capabilities']>;
  titles?: AnimeTitle[];
  episodes?: Episode[];
  stream?: StreamBundle | Error;
  health?: ProviderHealth | Error;
  searchDelayMs?: number;
  /** Set to a falsy value to simulate a provider whose search endpoint is broken. */
  search?: null;
}

function fakeProvider(options: FakeOptions): AnimeProvider {
  const capabilities = { ...NO_CAPABILITIES, search: true, metadata: true, ...options.capabilities };
  const descriptor: ProviderDescriptor = {
    id: options.id,
    name: options.id,
    descriptionKey: `providers.${options.id}.description`,
    capabilities,
    homepage: `https://${options.id}.example`,
    enabledByDefault: true,
  };
  const page = (items: AnimeTitle[]): Paged<AnimeTitle> => ({ items, page: 1, hasMore: false });
  return {
    descriptor,
    async search() {
      if (options.searchDelayMs) await new Promise((resolve) => setTimeout(resolve, options.searchDelayMs));
      if (options.search === undefined && options.titles === undefined) throw new Error(`${options.id} down`);
      return page(options.titles ?? []);
    },
    async discover() {
      return page(options.titles ?? []);
    },
    async getTitle(refId: string) {
      return options.titles?.find((title) => title.refId === refId) ?? makeTitle(options.id, refId);
    },
    async getEpisodes() {
      return options.episodes ?? [];
    },
    async getAvailableVoiceovers(): Promise<Voiceover[]> {
      return [];
    },
    async getAvailableQualities(): Promise<QualityVariant[]> {
      return [];
    },
    async getStream(_title: AnimeTitle, _episode: Episode): Promise<StreamBundle> {
      if (options.stream instanceof Error) throw options.stream;
      if (!options.stream) throw new Error('no stream configured');
      return options.stream;
    },
    async getGenres() {
      return ['Фэнтези'];
    },
    async getSchedule() {
      return options.titles ?? [];
    },
    async healthCheck(): Promise<ProviderHealth> {
      if (options.health instanceof Error) throw options.health;
      return options.health ?? { providerId: options.id, status: 'healthy', checkedAt: Date.now(), latencyMs: 10 };
    },
  } as unknown as AnimeProvider;
}

const filters: SearchFilters = { ...EMPTY_FILTERS, query: 'тестовый' };

describe('ProviderManager', () => {
  it('merges duplicate titles from several providers into one entry and keeps every ref', async () => {
    const manager = new ProviderManager();
    manager.register(
      fakeProvider({
        id: 'stream-a',
        capabilities: { streams: true },
        titles: [
          makeTitle('stream-a', '1', {
            episodesTotal: 12,
            capabilities: { ...NO_CAPABILITIES, search: true, metadata: true, streams: true },
          }),
        ],
      }),
    );
    manager.register(
      fakeProvider({
        id: 'meta-b',
        titles: [makeTitle('meta-b', '77', { title: 'Тестовый релиз', synopsis: 'Описание из второго источника', rating: 8.4 })],
      }),
    );

    const result = await manager.search(filters, 1);
    expect(result.items).toHaveLength(1);
    const merged = result.items[0]!;
    expect(merged.providerRefs.map((ref) => ref.providerId).sort()).toEqual(['meta-b', 'stream-a']);
    expect(merged.synopsis).toBe('Описание из второго источника');
    expect(merged.capabilities.streams).toBe(true);
    expect(merged.episodesTotal).toBe(12);
    expect(result.failures).toHaveLength(0);
    expect(result.usedProviders.sort()).toEqual(['meta-b', 'stream-a']);
  });

  it('isolates a broken provider: results still arrive and the failure is reported', async () => {
    const manager = new ProviderManager();
    manager.register(fakeProvider({ id: 'stream-a', capabilities: { streams: true }, titles: [makeTitle('stream-a', '1')] }));
    manager.register(fakeProvider({ id: 'broken', search: undefined as never, titles: undefined }));

    const result = await manager.search(filters, 1);
    expect(result.items.length).toBe(1);
    expect(result.failures).toEqual([expect.objectContaining({ providerId: 'broken', errorCode: 'PROVIDER_UNAVAILABLE' })]);
    expect((manager.getHealth('broken')[0] as { consecutiveFailures?: number })?.consecutiveFailures).toBe(1);
    expect(manager.getHealth('broken')[0]?.status).toBe('degraded');
    expect(manager.isHealthy('broken')).toBe(true);
  });

  it('never lets a hanging provider block the others', async () => {
    const manager = new ProviderManager({ concurrency: 4 });
    manager.register(fakeProvider({ id: 'fast', titles: [makeTitle('fast', '1')] }));
    manager.register(
      fakeProvider({
        id: 'slow',
        searchDelayMs: 0,
        titles: [makeTitle('slow', '9')],
      }),
    );
    const result = await manager.search(filters, 1);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it('skips providers that are disabled or lack the requested capability', async () => {
    const manager = new ProviderManager();
    manager.register(fakeProvider({ id: 'a', titles: [makeTitle('a', '1', { title: 'Первый тайтл' })] }));
    manager.register(fakeProvider({ id: 'b', titles: [makeTitle('b', '2', { title: 'Второй тайтл' })] }));
    manager.setDisabled(['b']);

    const result = await manager.search(filters, 1);
    expect(result.items.map((item) => item.providerId)).toEqual(['a']);

    manager.setDisabled([]);
    const all = await manager.search(filters, 1);
    expect(all.items.map((item) => item.providerId).sort()).toEqual(['a', 'b']);
  });

  it('falls back to the next streaming provider when the first one fails', async () => {
    const manager = new ProviderManager();
    const failing = fakeProvider({ id: 'stream-a', capabilities: { streams: true }, stream: new Error('boom') });
    const working = fakeProvider({
      id: 'stream-b',
      capabilities: { streams: true },
      stream: {
        episodeId: 'e1',
        providerId: 'stream-b',
        sources: [
          { id: 's1', providerId: 'stream-b', titleId: 'stream-b:5', episodeId: 'e1', url: 'https://cdn/s.m3u8', kind: 'hls', label: '720p', qualityId: '720', isDefault: true },
        ],
      },
    });
    manager.register(failing);
    manager.register(working);

    const title = {
      ...makeTitle('stream-a', '1'),
      providerRefs: [
        { providerId: 'stream-a', refId: '1' },
        { providerId: 'stream-b', refId: '5' },
      ],
    };
    const episode: Episode = {
      id: 'e1',
      titleId: title.id,
      providerId: 'stream-a',
      refId: '1',
      ordinal: 1,
      isAvailable: true,
    };

    const bundle = await manager.getStream(title, episode);
    expect(bundle.providerId).toBe('stream-b');
    expect(bundle.sources[0]?.url).toBe('https://cdn/s.m3u8');
  });

  it('throws a typed STREAM_UNAVAILABLE error when no provider can stream', async () => {
    const manager = new ProviderManager();
    manager.register(fakeProvider({ id: 'meta-only' }));
    const title = makeTitle('meta-only', '1');
    const episode: Episode = { id: 'e1', titleId: title.id, providerId: 'meta-only', refId: '1', ordinal: 1, isAvailable: true };
    await expect(manager.getStream(title, episode)).rejects.toMatchObject({ code: 'STREAM_UNAVAILABLE' });
  });

  it('caches health checks and refreshes them on demand', async () => {
    let probes = 0;
    const provider = fakeProvider({ id: 'a' });
    const wrapped: AnimeProvider = {
      ...provider,
      async healthCheck() {
        probes += 1;
        return { providerId: 'a', status: 'healthy', checkedAt: Date.now(), latencyMs: 5 };
      },
    };
    const manager = new ProviderManager({ healthTtlMs: 60_000 });
    manager.register(wrapped);

    await manager.checkHealth(['a'], false);
    await manager.checkHealth(['a'], false);
    expect(probes).toBe(1);

    await manager.checkHealth(['a'], true);
    expect(probes).toBe(2);
  });

  it('degrades a provider after one failure and marks it down only after repeated failures', async () => {
    const manager = new ProviderManager();
    manager.register(fakeProvider({ id: 'a', health: new Error('ECONNREFUSED') }));

    const [first] = await manager.checkHealth(['a'], true);
    expect(first?.status).toBe('degraded');
    expect((first as { consecutiveFailures?: number })?.consecutiveFailures).toBe(1);
    expect(first?.errorMessage).toContain('ECONNREFUSED');

    await manager.checkHealth(['a'], true);
    const [third] = await manager.checkHealth(['a'], true);
    expect(third?.status).toBe('down');
    expect((third as { consecutiveFailures?: number })?.consecutiveFailures).toBe(3);
  });

  it('deduplicates titles across differently-cased provider names', () => {
    const a = makeTitle('p1', '1', { title: 'Атака Титанов', alternativeTitles: ['Attack on Titan'] });
    const b = makeTitle('p2', '2', { title: 'атака титанов', alternativeTitles: [] });
    expect(isSameTitle(a, b)).toBe(true);
    expect(isSameTitle(a, makeTitle('p3', '3', { title: 'Совсем другое аниме', alternativeTitles: [] }))).toBe(false);
  });

  it('keeps provider refs unique when merging', () => {
    const merged = mergeProviderRefs(
      [{ providerId: 'a', refId: '1' }],
      [
        { providerId: 'a', refId: '1' },
        { providerId: 'b', refId: '2' },
      ],
    );
    expect(merged).toEqual([
      { providerId: 'a', refId: '1' },
      { providerId: 'b', refId: '2' },
    ]);
  });
});
