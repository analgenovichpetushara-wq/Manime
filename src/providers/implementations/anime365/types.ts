export interface A365Series {
  id: number;
  title?: string | null;
  type?: string | null;
  year?: number | null;
  season?: string | null;
  poster?: string | null;
  genres?: string[] | null;
  duration?: number | null;
  episodesTotal?: number | null;
  description?: string | null;
  myanimelist_id?: number | null;
  anilist_id?: number | null;
  shikimori_id?: number | null;
  updatedAt?: string | null;
}

export interface A365Translation {
  id: number;
  type?: string | null;
  title?: string | null;
  authors?: { id?: number; name?: string; url?: string }[] | null;
  episode?: number | null;
}

export interface A365Episode {
  id: number;
  seriesId?: number | null;
  translationId?: number | null;
  episode?: number | null;
  episodeFull?: string | null;
  name?: string | null;
  duration?: number | null;
  preview?: string | null;
  intro?: { start?: number | null; stop?: number | null } | null;
  ending?: { start?: number | null; stop?: number | null } | null;
  hls?: string | null;
}

export interface A365ListResponse<T> {
  data?: T[] | null;
  meta?: { total?: number } | null;
}
