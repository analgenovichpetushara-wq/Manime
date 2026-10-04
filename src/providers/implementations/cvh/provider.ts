import type { AnimeTitle, Episode, Paged, QualityVariant, StreamBundle, Voiceover } from '@/data/models/anime';
import { AppError } from '@/core/errors/AppError';
import { CvhApi, CVH_ID } from '@/providers/implementations/cvh/api';
import { mapEpisodes, mapQualities, mapStreams, mapTitle, mapVoiceovers } from '@/providers/implementations/cvh/mapper';
import type { CvhPlaylist } from '@/providers/implementations/cvh/api';
import type { AnimeProvider, ProviderDescriptor, ProviderHealth } from '@/providers/types';

const DESCRIPTOR: ProviderDescriptor = {
  id: CVH_ID,
  name: 'CVH (CdnVideoHub)',
  descriptionKey: 'providers.cvh.description',
  unavailableReasonKey: 'providers.cvh.noSearch',
  capabilities: {
    search: false,
    metadata: true,
    episodes: true,
    streams: true,
    voiceovers: true,
    qualities: true,
    schedule: false,
    publicApi: true,
  },
  homepage: 'https://cdnvideohub.com',
  enabledByDefault: true,
};

/** Signed CDN links expire within minutes, so bundles are never reused. */
const STREAM_TTL_MS = 3 * 60_000;

/**
 * CdnVideoHub — an open player API (`plapi.cdnvideohub.com`) that answers
 * without credentials.
 *
 * It is a player, not a catalogue: a media item is addressed by the publisher's
 * id, which lives on the site embedding the player. There is no title search,
 * so AnimAlc resolves CVH references the user provides (an iframe url, a
 * numeric id or `cvh:<id>`) instead of pretending to search — see
 * `parseCvhReference`.
 */
export class CvhProvider implements AnimeProvider {
  readonly descriptor = DESCRIPTOR;
  private readonly api: CvhApi;
  private readonly playlistCache = new Map<string, { playlist: CvhPlaylist; fetchedAt: number }>();

  constructor(api: CvhApi = new CvhApi()) {
    this.api = api;
  }

  private async loadPlaylist(id: string): Promise<CvhPlaylist> {
    const cached = this.playlistCache.get(id);
    if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) return cached.playlist;
    const playlist = await this.api.playlist(id);
    this.playlistCache.set(id, { playlist, fetchedAt: Date.now() });
    return playlist;
  }

  /**
   * CVH publishes no catalogue, so it never answers a text search. Throwing
   * keeps the manager's merged results honest instead of inventing matches.
   */
  async search(): Promise<Paged<AnimeTitle>> {
    throw new AppError({
      code: 'NOT_FOUND',
      providerId: CVH_ID,
      message: 'CdnVideoHub has no title search; open a CVH link or id instead',
    });
  }

  /** No catalogue to browse either. */
  async discover(): Promise<Paged<AnimeTitle>> {
    throw new AppError({
      code: 'NOT_FOUND',
      providerId: CVH_ID,
      message: 'CdnVideoHub publishes no catalogue to browse',
    });
  }

  /** CVH exposes no genre taxonomy. */
  async getGenres(): Promise<string[]> {
    return [];
  }

  async getTitle(refId: string): Promise<AnimeTitle> {
    const playlist = await this.loadPlaylist(refId);
    return mapTitle(refId, playlist.titleName, playlist.isSerial, playlist.items);
  }

  async getEpisodes(title: AnimeTitle): Promise<Episode[]> {
    const playlist = await this.loadPlaylist(title.refId);
    return mapEpisodes(title.id, playlist.items);
  }

  async getAvailableVoiceovers(title: AnimeTitle): Promise<Voiceover[]> {
    const playlist = await this.loadPlaylist(title.refId);
    return mapVoiceovers(title.id, playlist.items);
  }

  async getAvailableQualities(_title: AnimeTitle, episode: Episode): Promise<QualityVariant[]> {
    const video = await this.api.video(episode.refId);
    const sources = mapStreams(_title.id, episode, video);
    return mapQualities(sources);
  }

  async getStream(title: AnimeTitle, episode: Episode): Promise<StreamBundle> {
    const video = await this.api.video(episode.refId);
    const sources = mapStreams(title.id, episode, video);
    if (!sources.length) {
      throw new AppError({
        code: 'STREAM_UNAVAILABLE',
        providerId: CVH_ID,
        message: `CdnVideoHub returned no playable links for video ${episode.refId}`,
      });
    }
    return {
      episodeId: episode.id,
      providerId: CVH_ID,
      sources,
      expiresAt: Date.now() + STREAM_TTL_MS,
    };
  }

  async getSchedule(): Promise<AnimeTitle[]> {
    return [];
  }

  async healthCheck(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      // Any well-formed answer (even an empty playlist) proves the API is up.
      await this.api.playlist('1');
    } catch (error) {
      const appError = error instanceof AppError ? error : undefined;
      if (appError?.code === 'NOT_FOUND') {
        return { providerId: CVH_ID, status: 'healthy', checkedAt: Date.now(), latencyMs: Date.now() - started };
      }
      return {
        providerId: CVH_ID,
        status: 'down',
        checkedAt: Date.now(),
        latencyMs: Date.now() - started,
        errorCode: appError?.code ?? 'NETWORK_UNAVAILABLE',
        errorMessage: appError?.message ?? String(error),
      };
    }
    return { providerId: CVH_ID, status: 'healthy', checkedAt: Date.now(), latencyMs: Date.now() - started };
  }
}
