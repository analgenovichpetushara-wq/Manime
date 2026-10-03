import type {
  AnimeStatus,
  AnimeTitle,
  AnimeType,
  Episode,
  QualityVariant,
  Voiceover,
} from '@/data/models/anime';
import { titleKey } from '@/data/models/anime';
import type {
  KodikEpisodeEntry,
  KodikRelease,
  KodikSeasonEntry,
} from '@/providers/implementations/kodik/types';

export const KODIK_PROVIDER_ID = 'kodik';

/** Kodik answers with protocol-relative links (`//kodik.info/…`). */
export function absolutizeLink(link?: string): string | undefined {
  if (!link) return undefined;
  if (link.startsWith('//')) return `https:${link}`;
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  return undefined;
}

/** `WEB-DLRip 720p` / `BDRip 1080p` / `DVDRip` → height in pixels when stated. */
export function parseQualityHeight(quality?: string): number | undefined {
  if (!quality) return undefined;
  const match = /(\d{3,4})\s*p/i.exec(quality);
  if (!match) return undefined;
  const height = Number(match[1]);
  return Number.isFinite(height) && height > 0 ? height : undefined;
}

function mapType(release: KodikRelease): AnimeType {
  const kind = (release.material_data?.anime_kind ?? '').toLowerCase();
  if (kind.startsWith('tv')) return 'TV';
  if (kind === 'movie') return 'MOVIE';
  if (kind === 'ova') return 'OVA';
  if (kind === 'ona') return 'ONA';
  if (kind === 'special') return 'SPECIAL';
  if (kind === 'music') return 'SPECIAL';
  if (release.type === 'anime-serial') return 'TV';
  if (release.type === 'anime') return 'MOVIE';
  return 'UNKNOWN';
}

function mapStatus(release: KodikRelease): AnimeStatus {
  const status = (release.material_data?.anime_status ?? '').toLowerCase();
  if (status === 'released') return 'released';
  if (status === 'ongoing') return 'ongoing';
  if (status === 'anons' || status === 'anounced') return 'announced';
  return 'unknown';
}

function alternativeTitles(release: KodikRelease): string[] {
  const parts = [release.title_orig, ...(release.other_title ?? '').split('/')]
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0 && part !== release.title);
  return [...new Set(parts)];
}

function stripHtml(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || undefined;
}

function toDateMs(value?: string): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

/**
 * Kodik material → the app-wide AnimeTitle.
 * Fields Kodik does not expose stay `undefined` instead of being invented.
 */
export function mapRelease(
  release: KodikRelease,
  capabilities: AnimeTitle['capabilities'],
): AnimeTitle {
  const material = release.material_data;
  const poster = absolutizeLink(material?.poster) ?? absolutizeLink(release.screenshots?.[0]);
  const background =
    poster && poster !== absolutizeLink(release.screenshots?.[1])
      ? absolutizeLink(release.screenshots?.[1])
      : undefined;
  const providerRefs = [{ providerId: KODIK_PROVIDER_ID, refId: release.id }];
  if (release.shikimori_id) {
    providerRefs.push({ providerId: 'shikimori', refId: String(release.shikimori_id) });
  }

  return {
    id: titleKey(KODIK_PROVIDER_ID, release.id),
    providerId: KODIK_PROVIDER_ID,
    refId: release.id,
    title: release.title,
    titleEn: release.title_orig,
    titleOriginal: release.title_orig,
    alternativeTitles: alternativeTitles(release),
    poster,
    background,
    synopsis: stripHtml(material?.description),
    genres: [...(material?.genres ?? [])],
    tags: [...(material?.anime_studios ?? [])],
    year: typeof release.year === 'number' ? release.year : undefined,
    status: mapStatus(release),
    type: mapType(release),
    episodesTotal: release.episodes_count ?? release.last_episode,
    averageEpisodeDurationSec:
      typeof material?.duration === 'number' && material.duration > 0 ? material.duration * 60 : undefined,
    ageRating: material?.rating_mpaa,
    isMature: material?.rating_mpaa === 'rx' || material?.rating_mpaa === 'r',
    hasRussianVoice: release.translation?.type === 'voice',
    updatedAt: toDateMs(release.updated_at),
    providerRefs,
    capabilities,
  };
}

/** Flattens Kodik `seasons` into an ordered episode list. */
export function mapEpisodes(release: KodikRelease): Episode[] {
  const seasons = release.seasons ?? {};
  const episodes: Episode[] = [];
  const seasonKeys = Object.keys(seasons).sort((a, b) => Number(a) - Number(b));

  seasonKeys.forEach((seasonKey) => {
    const season: KodikSeasonEntry | undefined = seasons[seasonKey];
    const seasonNumber = Number(seasonKey) || 1;
    const entries = Object.entries(season?.episodes ?? {}).sort(
      (a, b) => Number(a[0]) - Number(b[0]),
    );
    entries.forEach(([episodeKey, entry]) => {
      const ordinal = Number(episodeKey);
      if (!Number.isFinite(ordinal)) return;
      const link = absolutizeLink((entry as KodikEpisodeEntry).link);
      episodes.push({
        id: `${titleKey(KODIK_PROVIDER_ID, release.id)}:s${seasonNumber}e${ordinal}`,
        titleId: titleKey(KODIK_PROVIDER_ID, release.id),
        providerId: KODIK_PROVIDER_ID,
        refId: `${seasonNumber}:${ordinal}`,
        ordinal,
        name: (entry as KodikEpisodeEntry).title || undefined,
        durationSec:
          typeof release.material_data?.duration === 'number' && release.material_data.duration > 0
            ? release.material_data.duration * 60
            : undefined,
        preview: absolutizeLink((entry as KodikEpisodeEntry).screenshots?.[0]),
        // Kodik exposes the official embed player link, never a raw media URL.
        playerUrl: link,
        isAvailable: !!link,
      });
    });
  });

  return episodes;
}

/** Distinct voiceovers Kodik reports for one material (one release per translation). */
export function mapVoiceovers(releases: KodikRelease[]): Voiceover[] {
  const seen = new Map<number, Voiceover>();
  releases.forEach((release) => {
    const translation = release.translation;
    if (!translation || seen.has(translation.id)) return;
    seen.set(translation.id, {
      id: `${KODIK_PROVIDER_ID}:t${translation.id}`,
      titleId: titleKey(KODIK_PROVIDER_ID, release.id),
      providerId: KODIK_PROVIDER_ID,
      refId: String(translation.id),
      name: translation.title,
      kind: translation.type === 'subtitles' ? 'subtitles' : 'voice',
      language: 'ru',
      isDefault: translation.type === 'voice',
    });
  });
  return [...seen.values()];
}

/**
 * Qualities Kodik reports for a material.
 *
 * Kodik documents a free-form `quality` label (`WEB-DLRip 720p`) and the embed
 * player link suffix (`/720p`) — those are the only quality signals the public
 * API gives, so qualities are derived from them instead of a hardcoded list.
 */
export function mapQualities(releases: KodikRelease[]): QualityVariant[] {
  const variants = new Map<number, QualityVariant>();
  releases.forEach((release) => {
    const height =
      parseQualityHeight(release.quality) ??
      parseQualityHeight(absolutizeLink(release.link)?.split('/').pop());
    if (!height) return;
    variants.set(height, {
      id: `${height}p`,
      label: `${height}p`,
      height,
      kind: 'hls',
    });
  });
  return [...variants.values()].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
}
