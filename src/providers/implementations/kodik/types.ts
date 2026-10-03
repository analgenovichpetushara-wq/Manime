/**
 * Raw Kodik API response shapes (base URL `https://kodik-api.com`).
 *
 * Field names mirror the API verbatim; nothing here is invented. Every field
 * was captured from real responses — see docs/PROVIDERS.md for the audit trail
 * and `__tests__/fixtures/kodik.ts` for the recorded payloads.
 */

export type KodikReleaseType =
  | 'anime'
  | 'anime-serial'
  | 'foreign-movie'
  | 'foreign-serial'
  | 'foreign-cartoon'
  | 'russian-cartoon'
  | 'russian-movie'
  | 'russian-serial'
  | 'soviet-cartoon'
  | 'cartoon-serial'
  | 'documentary-serial'
  | 'multi-part-film'
  | string;

export type KodikTranslationType = 'voice' | 'subtitles';

export interface KodikTranslationRef {
  id: number;
  title: string;
  type: KodikTranslationType;
}

/** One episode inside `seasons` (returned with `with_episodes=true`). */
export interface KodikEpisodeEntry {
  /** Official embed player URL for the episode, e.g. `//kodik.info/episode/1401678/…/720p`. */
  link: string;
  title?: string;
  screenshots?: string[];
}

/** Season entry (returned with `with_seasons` / `with_episodes`). */
export interface KodikSeasonEntry {
  link: string;
  episodes?: Record<string, KodikEpisodeEntry>;
}

/** Extra material data (returned with `with_material_data=true`). */
export interface KodikMaterialData {
  description?: string;
  genres?: string[];
  countries?: string[];
  anime_studios?: string[];
  anime_kind?: string;
  anime_status?: 'released' | 'ongoing' | 'anons' | string;
  anime_aid?: string;
  duration?: number;
  rating_mpaa?: string;
  poster?: string;
  screenshots?: string[];
  [key: string]: unknown;
}

export interface KodikRelease {
  /** Internal Kodik id, e.g. `serial-42758` / `movie-108152`. */
  id: string;
  type: KodikReleaseType;
  /** Official embed player link (protocol-relative). */
  link: string;
  title: string;
  title_orig?: string;
  other_title?: string;
  translation?: KodikTranslationRef;
  year?: number;
  last_season?: number;
  last_episode?: number;
  episodes_count?: number;
  kinopoisk_id?: string;
  imdb_id?: string;
  mdl_id?: string;
  worldart_link?: string;
  shikimori_id?: string;
  /** Free-form quality label, e.g. `WEB-DLRip 720p`, `DVDRip`, `TS 720p`. */
  quality?: string;
  camrip?: boolean;
  lgbt?: boolean;
  blocked_countries?: string[];
  blocked_seasons?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  screenshots?: string[];
  seasons?: Record<string, KodikSeasonEntry>;
  material_data?: KodikMaterialData;
}

/** Common envelope for `/search`, `/list` and the catalogue endpoints. */
export interface KodikListResponse<T> {
  time?: string;
  total: number;
  prev_page?: string | null;
  next_page?: string | null;
  results: T[];
}

/**
 * `/get-player` response — the documented way to ask Kodik for the player of a
 * title. It returns an embed link, never a media file.
 */
export interface KodikPlayerResponse {
  found: boolean;
  allowed: number;
  quality?: string | null;
  translation?: string | null;
  link?: string | null;
}

/** Error body: Kodik answers with `{"error": "…"}` (e.g. an invalid token). */
export interface KodikErrorBody {
  error: string;
}

/** Parameters accepted by `/search` and `/list` (documented, verified subset). */
export interface KodikQueryParams {
  title?: string;
  title_orig?: string;
  id?: string;
  shikimori_id?: string | number;
  kinopoisk_id?: string;
  imdb_id?: string;
  mdl_id?: string;
  types?: string;
  anime_kind?: string;
  anime_status?: string;
  year?: number;
  genres?: string;
  anime_genres?: string;
  translation_id?: string;
  translation_type?: KodikTranslationType;
  limit?: number;
  season?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  with_material_data?: boolean;
  with_seasons?: boolean;
  with_episodes?: boolean;
  with_episodes_data?: boolean;
  [key: string]: string | number | boolean | undefined;
}
