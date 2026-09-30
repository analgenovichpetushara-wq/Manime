import type { AnimeTitle, Episode, Voiceover, VoiceoverKind } from '@/data/models/anime';
import { NO_CAPABILITIES, titleKey } from '@/data/models/anime';
import type { A365Episode, A365Series, A365Translation } from '@/providers/implementations/anime365/types';

export const ANIME365_ID = 'anime365';

const CAPABILITIES = {
  ...NO_CAPABILITIES,
  search: true,
  metadata: true,
  episodes: true,
  voiceovers: true,
  publicApi: true,
} as const;

const TYPE_MAP: Record<string, AnimeTitle['type']> = {
  tv: 'TV',
  movie: 'MOVIE',
  ova: 'OVA',
  ona: 'ONA',
  special: 'SPECIAL',
};

export function mapSeries(series: A365Series): AnimeTitle {
  const tkey = titleKey(ANIME365_ID, String(series.id));
  const genres = series.genres ?? [];
  return {
    id: tkey,
    providerId: ANIME365_ID,
    refId: String(series.id),
    title: series.title ?? `Серия #${series.id}`,
    alternativeTitles: [series.title ?? ''].filter(Boolean),
    poster: normalizePoster(series.poster),
    synopsis: series.description ?? undefined,
    genres,
    tags: [series.season ?? '', String(series.year ?? '')].filter(Boolean),
    year: series.year ?? undefined,
    season: series.season ?? undefined,
    status: 'unknown',
    type: TYPE_MAP[(series.type ?? '').toLowerCase()] ?? 'UNKNOWN',
    episodesTotal: series.episodesTotal ?? undefined,
    // The API reports the average episode duration in minutes.
    averageEpisodeDurationSec: series.duration ? series.duration * 60 : undefined,
    isMature: false,
    hasRussianVoice: true,
    updatedAt: series.updatedAt ? Date.parse(series.updatedAt) : undefined,
    providerRefs: [{ providerId: ANIME365_ID, refId: String(series.id) }],
    capabilities: CAPABILITIES,
  };
}

function normalizePoster(poster?: string | null): string | undefined {
  if (!poster) return undefined;
  if (/^https?:\/\//i.test(poster)) return poster;
  return `https://smotret-anime.online${poster.startsWith('/') ? '' : '/'}${poster}`;
}

export function mapTranslation(translation: A365Translation, seriesId: number | string): Voiceover {
  const kind = mapVoiceoverKind(translation.type ?? '');
  return {
    id: `${ANIME365_ID}:${translation.id}`,
    titleId: titleKey(ANIME365_ID, String(seriesId)),
    providerId: ANIME365_ID,
    refId: String(translation.id),
    name: shortenTranslationName(translation.title ?? `Перевод #${translation.id}`),
    kind,
    language: kind === 'raw' ? 'ja' : 'ru',
    isDefault: kind === 'voice' || kind === 'dub',
    authors: (translation.authors ?? []).map((author) => author.name ?? '').filter(Boolean),
  };
}

function mapVoiceoverKind(type: string): VoiceoverKind {
  switch (type) {
    case 'voiceRu':
    case 'voice':
      return 'voice';
    case 'dubRu':
    case 'dub':
      return 'dub';
    case 'subRu':
    case 'subs':
    case 'subtitlesRu':
      return 'subtitles';
    case 'raw':
      return 'raw';
    default:
      return 'voice';
  }
}

function shortenTranslationName(value: string): string {
  return value.replace(/\s*ONA\s*/gi, ' ').replace(/озвучка от/gi, '·').replace(/\s+/g, ' ').trim();
}

export function mapEpisode(seriesId: number | string, episode: A365Episode, translationId?: number): Episode {
  const titleId = titleKey(ANIME365_ID, String(seriesId));
  const ordinal = episode.episode ?? 0;
  const intro =
    typeof episode.intro?.start === 'number' && typeof episode.intro?.stop === 'number'
      ? { start: episode.intro.start, end: episode.intro.stop }
      : undefined;
  const outro =
    typeof episode.ending?.start === 'number' && typeof episode.ending?.stop === 'number'
      ? { start: episode.ending.start, end: episode.ending.stop }
      : undefined;
  return {
    id: `${titleId}:ep:${episode.id}`,
    titleId,
    providerId: ANIME365_ID,
    refId: String(episode.id),
    ordinal: ordinal > 0 ? ordinal : Math.max(1, Math.round((episode.episodeFull?.match(/\d+/)?.[0] ?? '1') as unknown as number)),
    name: episode.name ?? episode.episodeFull ?? undefined,
    durationSec: episode.duration ?? undefined,
    preview: normalizePoster(episode.preview),
    introSkip: intro,
    outroSkip: outro,
    isAvailable: false,
    voiceoverRefId: translationId ? String(translationId) : undefined,
  };
}
