import type { AnimeTitle } from '@/data/models/anime';
import { NO_CAPABILITIES, titleKey } from '@/data/models/anime';
import type { ShikimoriAnime } from '@/providers/implementations/shikimori/types';

export const SHIKIMORI_ID = 'shikimori';
export const SHIKIMORI_IMAGE_ORIGIN = 'https://shikimori.io';

const CAPABILITIES = {
  ...NO_CAPABILITIES,
  search: true,
  metadata: true,
  publicApi: true,
} as const;

const KIND_MAP: Record<string, AnimeTitle['type']> = {
  tv: 'TV',
  movie: 'MOVIE',
  ova: 'OVA',
  ona: 'ONA',
  special: 'SPECIAL',
};

const STATUS_MAP: Record<string, AnimeTitle['status']> = {
  ongoing: 'ongoing',
  released: 'released',
  anons: 'announced',
  latest: 'ongoing',
};

export function mapShikimoriAnime(anime: ShikimoriAnime): AnimeTitle {
  const title = anime.russian || anime.name || `#${anime.id}`;
  const genres = (anime.genres ?? []).map((genre) => genre.russian || genre.name);
  const score = typeof anime.score === 'string' ? Number.parseFloat(anime.score) : anime.score ?? undefined;
  return {
    id: titleKey(SHIKIMORI_ID, String(anime.id)),
    providerId: SHIKIMORI_ID,
    refId: String(anime.id),
    title,
    titleEn: anime.name ?? undefined,
    alternativeTitles: [anime.name ?? ''].filter(Boolean),
    poster: anime.image?.original ? `${SHIKIMORI_IMAGE_ORIGIN}${anime.image.original}` : undefined,
    background: anime.image?.original ? `${SHIKIMORI_IMAGE_ORIGIN}${anime.image.original}` : undefined,
    synopsis: anime.description ?? undefined,
    genres,
    tags: [anime.kind ?? '', anime.rating ?? ''].filter(Boolean),
    year: anime.aired_on ? Number.parseInt(anime.aired_on.slice(0, 4), 10) : undefined,
    status: STATUS_MAP[anime.status ?? ''] ?? 'unknown',
    type: KIND_MAP[(anime.kind ?? '').toLowerCase()] ?? 'UNKNOWN',
    episodesTotal: anime.episodes ?? undefined,
    averageEpisodeDurationSec: anime.duration ? anime.duration * 60 : undefined,
    rating: Number.isFinite(score) && score ? score : undefined,
    isMature: genres.some((genre) => ['этти', 'эротика', 'взрослые персонажи'].includes(genre.toLowerCase())),
    hasRussianVoice: false,
    providerRefs: [
      { providerId: SHIKIMORI_ID, refId: String(anime.id) },
    ],
    capabilities: CAPABILITIES,
  };
}
