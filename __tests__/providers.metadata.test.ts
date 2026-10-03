import { mapEpisode as mapA365Episode, mapSeries, mapTranslation } from '@/providers/implementations/anime365/mapper';
import { mapShikimoriAnime } from '@/providers/implementations/shikimori/mapper';
import { KodikProvider } from '@/providers/implementations/kodik/provider';
import { KodikApi } from '@/providers/implementations/kodik/api';
import { a365Episode, a365Series, a365Translation, shikimoriAnime } from './fixtures/releases';

describe('Anime365 (smotret-anime) metadata provider', () => {
  it('maps a series without claiming stream support', () => {
    const title = mapSeries(a365Series as never);
    expect(title.id).toBe('anime365:998877');
    expect(title.title).toBe('Тестовый сериал');
    expect(title.genres).toEqual(['Драма', 'Романтика']);
    expect(title.episodesTotal).toBe(12);
    expect(title.averageEpisodeDurationSec).toBe(1440);
    // The public API is login-gated for streams — the provider must say so honestly.
    expect(title.capabilities.streams).toBe(false);
    expect(title.capabilities.episodes).toBe(true);
    expect(title.capabilities.voiceovers).toBe(true);
    expect(title.capabilities.publicApi).toBe(true);
  });

  it('maps Russian translations into voiceover entries', () => {
    const voiceover = mapTranslation(a365Translation as never, 998877);
    expect(voiceover.kind).toBe('voice');
    expect(voiceover.language).toBe('ru');
    expect(voiceover.name).toContain('AnimAlc');
    expect(voiceover.authors).toContain('AnimAlc Team');
  });

  it('maps episodes with intro and outro windows', () => {
    const episode = mapA365Episode(998877, a365Episode as never, 4242);
    expect(episode.ordinal).toBe(1);
    expect(episode.introSkip).toEqual({ start: 10, end: 95 });
    expect(episode.outroSkip).toEqual({ start: 1300, end: 1400 });
    expect(episode.durationSec).toBe(1440);
  });

  it('survives missing optional fields', () => {
    const title = mapSeries({ id: 5, title: null, genres: null } as never);
    expect(title.id).toBe('anime365:5');
    expect(title.genres).toEqual([]);
    expect(title.title.length).toBeGreaterThan(0);
  });
});

describe('Shikimori metadata provider', () => {
  it('maps scores, russian title and genres', () => {
    const title = mapShikimoriAnime(shikimoriAnime as never);
    expect(title.id).toBe('shikimori:12345');
    expect(title.title).toBe('Тестовый релиз');
    expect(title.titleEn).toBe('Test Release');
    expect(title.rating).toBeCloseTo(8.1);
    expect(title.episodesTotal).toBe(12);
    expect(title.poster).toContain('https://');
    expect(title.capabilities.episodes).toBe(false);
    expect(title.capabilities.streams).toBe(false);
  });

  it('keeps age-rating metadata intact when a provider serves it', () => {
    const title = mapShikimoriAnime({ ...shikimoriAnime, rating: 'r_plus' } as never);
    expect(title.tags).toContain('r_plus');
    expect(title.genres.length).toBeGreaterThan(0);
  });
});

describe('Kodik (credential-gated)', () => {
  it('reports the missing token instead of faking data', async () => {
    const provider = new KodikProvider(new KodikApi({ baseUrl: 'https://kodik-api.com', token: '' }));
    expect(provider.isConfigured).toBe(false);
    await expect(provider.search('naruto', { query: 'naruto', genres: [], years: [], statuses: [], providerIds: [], voiceoverKinds: [] }, 1)).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
    });
    await expect(provider.getStream()).rejects.toMatchObject({ code: 'STREAM_UNAVAILABLE' });
    expect(provider.descriptor.capabilities.publicApi).toBe(false);
    expect(provider.descriptor.unavailableReasonKey).toBe('providers.kodik.requiresToken');
  });
});
