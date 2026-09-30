import type { AnimeTitle, Episode, QualityVariant, StreamSource, Voiceover } from '@/data/models/anime';
import { titleKey, NO_CAPABILITIES } from '@/data/models/anime';
import { anilibriaApi, absoluteMediaUrl } from '@/providers/implementations/anilibria/api';
import type { AnilibriaEpisode, AnilibriaMember, AnilibriaRelease } from '@/providers/implementations/anilibria/types';

export const ANILIBRIA_ID = 'anilibria';
export const ANILIBRIA_VOICEOVER_ID = 'anilibria:anilibria-ru';

const CAPABILITIES = {
  ...NO_CAPABILITIES,
  search: true,
  metadata: true,
  episodes: true,
  streams: true,
  voiceovers: true,
  qualities: true,
  schedule: true,
  publicApi: true,
} as const;

const MATURE_GENRES = ['этти', 'эротика', 'гарем', 'взрослый'];

export function mapRelease(release: AnilibriaRelease): AnimeTitle {
  const poster = release.poster?.optimized?.src ?? release.poster?.src ?? release.poster?.preview ?? undefined;
  const background = release.background_covers?.[0]?.optimized?.src ?? release.background_covers?.[0]?.src ?? undefined;
  const genres = (release.genres ?? []).map((genre) => genre.name).filter(Boolean);
  const tkey = titleKey(ANILIBRIA_ID, String(release.id));

  return {
    id: tkey,
    providerId: ANILIBRIA_ID,
    refId: String(release.id),
    title: release.name?.main ?? release.name?.english ?? `Релиз #${release.id}`,
    titleEn: release.name?.english ?? undefined,
    titleOriginal: release.name?.alternative ?? undefined,
    alternativeTitles: [release.alias ?? '', release.name?.english ?? '', release.name?.alternative ?? ''].filter(Boolean),
    poster: absoluteMediaUrl(poster),
    background: absoluteMediaUrl(background),
    synopsis: release.description ?? undefined,
    genres,
    tags: [release.type?.description ?? '', release.season?.description ?? '', release.age_rating?.label ?? ''].filter(Boolean),
    year: release.year ?? undefined,
    season: release.season?.description ?? undefined,
    status: release.is_ongoing ? 'ongoing' : release.is_in_production === false ? 'released' : 'released',
    type: mapType(release.type?.value),
    episodesTotal: release.episodes_total ?? undefined,
    averageEpisodeDurationSec: (release.average_duration_of_episode ?? 0) * 60 || undefined,
    rating: release.rating?.average ?? release.shikimori?.rating ?? release.mal?.rating ?? undefined,
    ratingVotes: release.rating?.votes ?? release.shikimori?.votes ?? release.mal?.votes ?? undefined,
    ageRating: release.age_rating?.label ?? undefined,
    isMature:
      release.age_rating?.is_adult === true ||
      genres.some((genre) => MATURE_GENRES.includes(genre.toLowerCase())),
    hasRussianVoice: true,
    updatedAt: release.updated_at ? Date.parse(release.updated_at) : undefined,
    providerRefs: [{ providerId: ANILIBRIA_ID, refId: String(release.id) }],
    capabilities: CAPABILITIES,
  };
}

function mapType(value?: string | null): AnimeTitle['type'] {
  switch ((value ?? '').toUpperCase()) {
    case 'TV':
      return 'TV';
    case 'MOVIE':
      return 'MOVIE';
    case 'OVA':
      return 'OVA';
    case 'ONA':
      return 'ONA';
    case 'SPECIAL':
      return 'SPECIAL';
    default:
      return 'UNKNOWN';
  }
}

export function mapEpisode(releaseId: number | string, episode: AnilibriaEpisode): Episode {
  const titleId = titleKey(ANILIBRIA_ID, String(releaseId));
  const intro =
    typeof episode.opening?.start === 'number' && typeof episode.opening?.stop === 'number'
      ? { start: episode.opening.start, end: episode.opening.stop }
      : undefined;
  const outro =
    typeof episode.ending?.start === 'number' && typeof episode.ending?.stop === 'number'
      ? { start: episode.ending.start, end: episode.ending.stop }
      : undefined;

  return {
    id: `${titleId}:ep:${episode.id}`,
    titleId,
    providerId: ANILIBRIA_ID,
    refId: episode.id,
    ordinal: episode.ordinal,
    name: episode.name ?? undefined,
    nameEn: episode.name_english ?? undefined,
    durationSec: episode.duration ?? undefined,
    preview: absoluteMediaUrl(
      episode.preview?.optimized?.preview ?? episode.preview?.preview ?? episode.preview?.src ?? undefined,
    ),
    introSkip: intro,
    outroSkip: outro,
    isAvailable: Boolean(episode.hls_480 ?? episode.hls_720 ?? episode.hls_1080),
    voiceoverRefId: 'anilibria-ru',
  };
}

export function mapVoiceover(release: AnilibriaRelease): Voiceover {
  const authors = (release.members ?? [])
    .filter((member: AnilibriaMember) => member.role?.value === 'voicing')
    .map((member) => member.nickname ?? '')
    .filter(Boolean);
  return {
    id: ANILIBRIA_VOICEOVER_ID,
    titleId: titleKey(ANILIBRIA_ID, String(release.id)),
    providerId: ANILIBRIA_ID,
    refId: 'anilibria-ru',
    name: 'AniLibria',
    kind: 'voice',
    language: 'ru',
    isDefault: true,
    authors: authors.length ? authors : undefined,
  };
}

export function mapStreams(releaseId: number | string, episode: AnilibriaEpisode, episodeModel: Episode): StreamSource[] {
  const titleId = titleKey(ANILIBRIA_ID, String(releaseId));
  const variants: { url?: string | null; height: number; label: string }[] = [
    { url: episode.hls_1080, height: 1080, label: '1080p' },
    { url: episode.hls_720, height: 720, label: '720p' },
    { url: episode.hls_480, height: 480, label: '480p' },
  ];
  return variants
    .filter((variant): variant is { url: string; height: number; label: string } => typeof variant.url === 'string' && variant.url.length > 0)
    .map((variant) => ({
      id: `${episodeModel.id}:${variant.height}`,
      providerId: ANILIBRIA_ID,
      titleId,
      episodeId: episodeModel.id,
      voiceoverId: ANILIBRIA_VOICEOVER_ID,
      url: absoluteMediaUrl(variant.url) ?? variant.url,
      kind: 'hls' as const,
      label: variant.label,
      height: variant.height,
      qualityId: String(variant.height),
      isDefault: variant.height === 720,
    }));
}

export function mapQualities(sources: StreamSource[]): QualityVariant[] {
  return sources.map((source) => ({
    id: source.qualityId,
    label: source.label,
    height: source.height,
    kind: source.kind,
  }));
}

export function proxyImage(path?: string | null): string | undefined {
  return absoluteMediaUrl(path, anilibriaApi.baseUrl);
}
