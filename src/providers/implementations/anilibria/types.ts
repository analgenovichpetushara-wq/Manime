export interface AnilibriaImage {
  src?: string;
  preview?: string;
  thumbnail?: string;
  optimized?: { src?: string | null; preview?: string | null; thumbnail?: string | null } | null;
}

export interface AnilibriaGenre {
  id: number;
  name: string;
  total_releases?: number;
  image?: AnilibriaImage | null;
}

export interface AnilibriaMember {
  id: string;
  role?: { value?: string; description?: string } | null;
  nickname?: string;
}

export interface AnilibriaEpisode {
  id: string;
  name?: string | null;
  name_english?: string | null;
  ordinal: number;
  opening?: { start?: number | null; stop?: number | null } | null;
  ending?: { start?: number | null; stop?: number | null } | null;
  preview?: AnilibriaImage | null;
  hls_480?: string | null;
  hls_720?: string | null;
  hls_1080?: string | null;
  duration?: number | null;
  rutube_id?: string | null;
  youtube_id?: string | null;
  updated_at?: string | null;
  sort_order?: number | null;
  release_id?: number | null;
}

export interface AnilibriaRelease {
  id: number;
  type?: { value?: string | null; description?: string | null } | null;
  year?: number | null;
  name?: { main?: string | null; english?: string | null; alternative?: string | null } | null;
  alias?: string | null;
  season?: { value?: string | null; description?: string | null } | null;
  shikimori?: { id?: number | null; url?: string | null; votes?: number | null; rating?: number | null } | null;
  mal?: { id?: number | null; url?: string | null; votes?: number | null; rating?: number | null } | null;
  rating?: { average?: number | null; votes?: number | null } | null;
  poster?: AnilibriaImage | null;
  background_covers?: AnilibriaImage[] | null;
  fresh_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_ongoing?: boolean | null;
  age_rating?: { value?: string | null; label?: string | null; is_adult?: boolean | null } | null;
  publish_day?: { value?: number | null; description?: string | null } | null;
  description?: string | null;
  episodes_total?: number | null;
  external_player?: string | null;
  is_in_production?: boolean | null;
  is_blocked_by_geo?: boolean | null;
  is_blocked_by_copyrights?: boolean | null;
  added_in_users_favorites?: number | null;
  average_duration_of_episode?: number | null;
  genres?: AnilibriaGenre[] | null;
  members?: AnilibriaMember[] | null;
  episodes?: AnilibriaEpisode[] | null;
}

export interface AnilibriaPagedResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      total?: number;
      count?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
      links?: { next?: string | null } | null;
    } | null;
  } | null;
}

export interface AnilibriaStatusResponse {
  request?: { ip?: string; country?: string; iso_code?: string; timezone?: string } | null;
  is_alive?: boolean;
  available_api_endpoints?: string[];
}
