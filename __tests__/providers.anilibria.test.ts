import { mapEpisode, mapQualities, mapRelease, mapStreams, mapVoiceover, proxyImage } from '@/providers/implementations/anilibria/mapper';
import { apiOrigin, absoluteMediaUrl } from '@/providers/implementations/anilibria/api';
import { anilibriaEpisode, anilibriaEpisodeWithoutStreams, anilibriaRelease } from './fixtures/releases';
import { AppError } from '@/core/errors/AppError';

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
