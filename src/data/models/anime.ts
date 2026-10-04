export type AnimeStatus = 'ongoing' | 'released' | 'announced' | 'unknown';

export type AnimeType = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'UNKNOWN';

export type StreamKind = 'hls' | 'dash' | 'mp4';

export type VoiceoverKind = 'voice' | 'dub' | 'subtitles' | 'raw';

export interface ProviderCapabilities {
  search: boolean;
  metadata: boolean;
  episodes: boolean;
  streams: boolean;
  voiceovers: boolean;
  qualities: boolean;
  schedule: boolean;
  /** True when the provider exposes its catalogue without credentials. */
  publicApi: boolean;
}

export interface ProviderRef {
  providerId: string;
  /** Provider native identifier (release id, slug, MAL/Shikimori id…). */
  refId: string;
  /** Provider native season/part marker when the same title is split differently. */
  seasonLabel?: string;
}

export interface AnimeTitle {
  /** Stable global id ("providerId:refId"). */
  id: string;
  providerId: string;
  refId: string;
  title: string;
  titleEn?: string;
  titleOriginal?: string;
  alternativeTitles: string[];
  poster?: string;
  background?: string;
  synopsis?: string;
  genres: string[];
  tags: string[];
  year?: number;
  season?: string;
  status: AnimeStatus;
  type: AnimeType;
  episodesTotal?: number;
  averageEpisodeDurationSec?: number;
  rating?: number;
  ratingVotes?: number;
  ageRating?: string;
  isMature: boolean;
  hasRussianVoice: boolean;
  updatedAt?: number;
  providerRefs: ProviderRef[];
  capabilities: ProviderCapabilities;
}

export interface Episode {
  id: string;
  titleId: string;
  providerId: string;
  refId: string;
  ordinal: number;
  name?: string;
  nameEn?: string;
  durationSec?: number;
  preview?: string;
  introSkip?: { start: number; end: number };
  outroSkip?: { start: number; end: number };
  isAvailable: boolean;
  voiceoverRefId?: string;
  /**
   * Official provider player page for sources that expose an embed player
   * instead of a media URL (Kodik). Never used as a stream source.
   */
  playerUrl?: string;
}

export interface Voiceover {
  id: string;
  titleId: string;
  providerId: string;
  refId: string;
  name: string;
  kind: VoiceoverKind;
  language: string;
  isDefault: boolean;
  authors?: string[];
}

export interface QualityVariant {
  id: string;
  label: string;
  height?: number;
  kind: StreamKind;
}

export interface StreamSource {
  id: string;
  providerId: string;
  titleId: string;
  episodeId: string;
  voiceoverId?: string;
  url: string;
  kind: StreamKind;
  label: string;
  height?: number;
  qualityId: string;
  headers?: Record<string, string>;
  isDefault: boolean;
}

export interface StreamBundle {
  episodeId: string;
  providerId: string;
  sources: StreamSource[];
  voiceover?: Voiceover;
  expiresAt?: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  totalPages?: number;
  totalItems?: number;
  hasMore: boolean;
}

export interface SearchFilters {
  query: string;
  genres: string[];
  years: number[];
  /** Release format: TV serial, film, OVA… (`AnimeType`). */
  types: AnimeType[];
  statuses: AnimeStatus[];
  providerIds: string[];
  voiceoverKinds: VoiceoverKind[];
  minEpisodes?: number;
}

export const EMPTY_FILTERS: SearchFilters = {
  query: '',
  genres: [],
  years: [],
  types: [],
  statuses: [],
  providerIds: [],
  voiceoverKinds: [],
};

export const NO_CAPABILITIES: ProviderCapabilities = {
  search: false,
  metadata: false,
  episodes: false,
  streams: false,
  voiceovers: false,
  qualities: false,
  schedule: false,
  publicApi: false,
};

export function titleKey(providerId: string, refId: string): string {
  return `${providerId}:${refId}`;
}
