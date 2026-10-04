/**
 * Payloads of the CdnVideoHub ("CVH") player API.
 *
 * Captured live on 2026-10-04 from the open endpoints
 * `https://plapi.cdnvideohub.com/api/v1/player/sv/playlist?pub=747&aggr=mali&id=51019`
 * and `…/video/10417869052469` — both answer without any credentials.
 */

/** One playlist entry: one episode in one particular dub. */
export interface CvhPlaylistItem {
  /** Publisher-side media id (a UUID); shared by the whole media item. */
  cvhId?: string;
  /** Video id used by `/video/<vkId>`. */
  vkId: string;
  voiceStudio?: string | null;
  voiceType?: string | null;
  season?: number | null;
  episode?: number | null;
}

export interface CvhPlaylistResponse {
  titleName?: string | null;
  isSerial?: boolean | null;
  items?: CvhPlaylistItem[] | null;
}

/** Odnoklassniki naming: the `sources` keys map onto picture heights. */
export interface CvhSources {
  hlsUrl?: string | null;
  dashUrl?: string | null;
  dashManifestUrl?: string | null;
  mpegMobileUrl?: string | null;
  mpegTinyUrl?: string | null;
  mpegLowestUrl?: string | null;
  mpegLowUrl?: string | null;
  mpegMediumUrl?: string | null;
  mpegHighUrl?: string | null;
  mpegFullHdUrl?: string | null;
  mpegQhdUrl?: string | null;
  mpeg2kUrl?: string | null;
  mpeg4kUrl?: string | null;
  [key: string]: string | null | undefined;
}

export interface CvhVideoResponse {
  unitedVideoId?: number | string | null;
  duration?: number | null;
  failoverHost?: string | null;
  thumbUrl?: string | null;
  sources?: CvhSources | null;
}
