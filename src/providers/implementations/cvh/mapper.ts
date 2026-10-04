import type { AnimeTitle, Episode, QualityVariant, StreamSource, Voiceover } from '@/data/models/anime';
import { NO_CAPABILITIES, titleKey } from '@/data/models/anime';
import { CVH_ID } from '@/providers/implementations/cvh/api';
import type { CvhPlaylistItem, CvhVideoResponse } from '@/providers/implementations/cvh/types';

/** Odnoklassniki naming → picture height (the API's own keys, no guessing). */
export const CVH_QUALITY_HEIGHTS: Record<string, number> = {
  mpegMobileUrl: 144,
  mpegTinyUrl: 144,
  mpegLowestUrl: 240,
  mpegLowUrl: 360,
  mpegMediumUrl: 480,
  mpegHighUrl: 720,
  mpegFullHdUrl: 1080,
  mpegQhdUrl: 1440,
  mpeg2kUrl: 2048,
  mpeg4kUrl: 2160,
};

export function voiceoverRefId(studio?: string | null): string {
  const slug = String(studio ?? 'default')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `cvh:voice:${slug || 'default'}`;
}

export function mapTitle(id: string, name: string | undefined, isSerial: boolean | undefined, items: CvhPlaylistItem[]): AnimeTitle {
  const titleId = titleKey(CVH_ID, id);
  const episodes = new Set(items.map((item) => item.episode ?? 1));
  return {
    id: titleId,
    providerId: CVH_ID,
    refId: id,
    title: name?.trim() || titleId,
    alternativeTitles: [],
    genres: [],
    tags: [],
    status: 'unknown',
    type: isSerial === false ? 'MOVIE' : 'TV',
    episodesTotal: episodes.size || undefined,
    isMature: false,
    hasRussianVoice: true,
    providerRefs: [{ providerId: CVH_ID, refId: id }],
    capabilities: {
      ...NO_CAPABILITIES,
      metadata: true,
      episodes: true,
      streams: true,
      voiceovers: true,
      qualities: true,
      publicApi: true,
    },
  };
}

/** One playlist entry is one episode in one particular dub. */
export function mapEpisode(titleId: string, item: CvhPlaylistItem, durationSec?: number): Episode {
  const ordinal = item.episode ?? 1;
  return {
    id: titleKey(CVH_ID, String(item.vkId)),
    titleId,
    providerId: CVH_ID,
    refId: String(item.vkId),
    ordinal,
    name: `Серия ${ordinal}`,
    durationSec,
    isAvailable: Boolean(item.vkId),
    voiceoverRefId: voiceoverRefId(item.voiceStudio),
  };
}

export function mapEpisodes(titleId: string, items: CvhPlaylistItem[]): Episode[] {
  return items
    .filter((item) => item.vkId)
    .map((item) => mapEpisode(titleId, item))
    .sort((a, b) => a.ordinal - b.ordinal || (a.voiceoverRefId ?? '').localeCompare(b.voiceoverRefId ?? ''));
}

export function mapVoiceovers(titleId: string, items: CvhPlaylistItem[]): Voiceover[] {
  const seen = new Map<string, { name: string; kind: Voiceover['kind'] }>();
  items.forEach((item) => {
    const refId = voiceoverRefId(item.voiceStudio);
    if (seen.has(refId)) return;
    const type = String(item.voiceType ?? '').toLowerCase();
    seen.set(refId, {
      name: item.voiceStudio?.trim() || 'Озвучка',
      kind: type.includes('субтитр') || type.includes('subtitl') ? 'subtitles' : 'dub',
    });
  });
  return [...seen.entries()].map(([refId, value], index) => ({
    id: `${titleId}:${refId}`,
    titleId,
    providerId: CVH_ID,
    refId,
    name: value.name,
    kind: value.kind,
    language: 'ru',
    isDefault: index === 0,
  }));
}

/**
 * Maps a `/video/<vkId>` answer onto stream sources. The HLS master playlist is
 * exposed alongside every progressive rendition the CDN returned.
 */
export function mapStreams(titleId: string, episode: Episode, video: CvhVideoResponse): StreamSource[] {
  const sources = video.sources ?? {};
  const out: StreamSource[] = [];

  const hls = sources.hlsUrl;
  if (hls) {
    out.push({
      id: `${episode.id}:hls`,
      providerId: CVH_ID,
      titleId,
      episodeId: episode.id,
      voiceoverId: episode.voiceoverRefId,
      url: hls,
      kind: 'hls',
      label: 'HLS',
      qualityId: 'hls',
      isDefault: true,
    });
  }

  Object.entries(sources).forEach(([key, value]) => {
    if (typeof value !== 'string' || !value.startsWith('http')) return;
    if (key === 'hlsUrl' || key === 'dashUrl' || key === 'dashManifestUrl') return;
    const height = CVH_QUALITY_HEIGHTS[key];
    if (!height) return;
    out.push({
      id: `${episode.id}:${height}`,
      providerId: CVH_ID,
      titleId,
      episodeId: episode.id,
      voiceoverId: episode.voiceoverRefId,
      url: value,
      kind: 'mp4',
      label: `${height}p`,
      height,
      qualityId: String(height),
      isDefault: false,
    });
  });

  return out.sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
}

export function mapQualities(sources: StreamSource[]): QualityVariant[] {
  return sources.map((source) => ({
    id: source.qualityId,
    label: source.label,
    height: source.height,
    kind: source.kind,
  }));
}
