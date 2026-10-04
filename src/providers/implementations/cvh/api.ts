import { AppError } from '@/core/errors/AppError';
import { httpJson } from '@/core/http/httpClient';
import type { CvhPlaylistItem, CvhPlaylistResponse, CvhVideoResponse } from '@/providers/implementations/cvh/types';

export const CVH_ID = 'cvh';

/** Open API base (no credentials, verified live). */
export const CVH_DEFAULT_BASE_URL = 'https://plapi.cdnvideohub.com/api/v1/player/sv';

/** Publisher/aggregator pair of the catalogue the playlist ids belong to. */
export const CVH_PUBLISHER = { pub: '747', aggr: 'mali' } as const;

/** The player checks this referer; the value is public and not a credential. */
export const CVH_REFERER = 'https://animego.org/';

/** A resolved playlist: its entries and the metadata CVH reports for them. */
export interface CvhPlaylist {
  items: CvhPlaylistItem[];
  titleName?: string;
  isSerial?: boolean;
}

export interface CvhApiOptions {
  baseUrl?: string;
  referer?: string;
  timeoutMs?: number;
}

/**
 * Pulls the CVH media id out of anything a user can paste: a full iframe url
 * (`/cdn-iframe/<id>/<season>/<episode>?dubbing=…`), a bare numeric id, or a
 * `cvh:<id>` reference. Returns undefined for anything else.
 */
export function parseCvhReference(input: string): { id: string; season?: number; episode?: number; studio?: string } | undefined {
  const value = input.trim();
  if (!value || value.length > 400) return undefined;

  const match = /\/cdn-iframe\/([0-9a-f-]{4,64})((?:\/[^/?#]+){0,3})/i.exec(value);
  if (match) {
    const id = match[1] ?? '';
    const segments = (match[2] ?? '').split('/').filter(Boolean);
    let studio: string | undefined;
    if (segments.length > 0 && !/^\d+$/.test(segments[0] ?? '')) {
      studio = decodeURIComponent(segments.shift() ?? '');
    }
    const numbers = segments.filter((segment) => /^\d+$/.test(segment)).map((segment) => Number.parseInt(segment, 10));
    const dubbing = /[?&]dubbing=([^&#]+)/.exec(value);
    return {
      id,
      season: numbers[0],
      episode: numbers[1],
      studio: dubbing?.[1] ? decodeURIComponent(dubbing[1]) : studio,
    };
  }

  const prefixed = /^cvh:([0-9a-f-]{1,64})$/i.exec(value);
  if (prefixed) return { id: prefixed[1] ?? '' };

  if (/^\d{2,12}$/.test(value)) return { id: value };

  return undefined;
}

/**
 * CdnVideoHub HTTP client.
 *
 * Both endpoints are public and answer JSON without a token. The video CDN
 * answers with Odnoklassniki naming (`mpegHighUrl`, `hlsUrl`, …) and the links
 * are signed and short-lived, so they are resolved right before playback and
 * never cached.
 */
export class CvhApi {
  readonly baseUrl: string;
  private readonly referer: string;
  private readonly timeoutMs: number;

  constructor(options: CvhApiOptions = {}) {
    this.baseUrl = (options.baseUrl ?? CVH_DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.referer = options.referer ?? CVH_REFERER;
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  private async request<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    try {
      const response = await httpJson<T>(this.baseUrl, path, {
        query,
        providerId: CVH_ID,
        timeoutMs: this.timeoutMs,
        attempts: 2,
        headers: { Referer: this.referer },
      });
      return response.data;
    } catch (error) {
      if (error instanceof AppError && (error.status === 401 || error.status === 403)) {
        throw new AppError({
          code: 'AUTHENTICATION_REQUIRED',
          providerId: CVH_ID,
          message: 'CdnVideoHub refused the request',
          status: error.status,
          cause: error,
        });
      }
      throw error;
    }
  }

  /** Every episode and dub of a media item, plus the title the API reports. */
  async playlist(id: string): Promise<CvhPlaylist> {
    const data = await this.request<CvhPlaylistResponse>('/playlist', {
      pub: CVH_PUBLISHER.pub,
      aggr: CVH_PUBLISHER.aggr,
      id,
    });
    const items = (data?.items ?? []).filter((item) => item && item.vkId);
    if (!items.length) {
      throw new AppError({
        code: 'NOT_FOUND',
        providerId: CVH_ID,
        message: `CdnVideoHub returned an empty playlist for id=${id}`,
      });
    }
    return { items, titleName: data?.titleName ?? undefined, isSerial: data?.isSerial ?? undefined };
  }

  /** Streams of one video (`vkId`). Links are signed and expire quickly. */
  async video(videoId: string): Promise<CvhVideoResponse> {
    const data = await this.request<CvhVideoResponse>(`/video/${encodeURIComponent(videoId)}`);
    if (!data || typeof data !== 'object') {
      throw new AppError({ code: 'INVALID_PAYLOAD', providerId: CVH_ID, message: 'CdnVideoHub video payload malformed' });
    }
    return data;
  }
}

export const cvhApi = new CvhApi();
