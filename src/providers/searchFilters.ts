import type { AnimeTitle, SearchFilters } from '@/data/models/anime';

/**
 * Client-side filter application.
 *
 * Several public sources accept fewer filters than the UI offers — the
 * AniLiberty catalogue endpoint, verified live on 2026-10-04, answers
 * identically with or without `genres`, `years`, `is_ongoing`, `ordering` and
 * `type`/`types`, so parameters alone cannot be trusted to narrow a result set.
 * Applying the filters here keeps the UI honest for every provider instead of
 * silently showing unfiltered results.
 */
export function matchesFilters(title: AnimeTitle, filters: SearchFilters): boolean {
  if (filters.types.length && !filters.types.includes(title.type)) return false;

  if (filters.years.length && (title.year === undefined || !filters.years.includes(title.year))) return false;

  if (filters.statuses.length && !filters.statuses.includes(title.status)) return false;

  if (filters.minEpisodes && (title.episodesTotal ?? 0) < filters.minEpisodes) return false;

  if (filters.genres.length) {
    const available = new Set(title.genres.map((genre) => genre.trim().toLowerCase()));
    const wanted = filters.genres.map((genre) => genre.trim().toLowerCase());
    if (!wanted.every((genre) => available.has(genre))) return false;
  }

  return true;
}

/** Filters a page in place of a provider that cannot narrow it server-side. */
export function applyFilters<T extends AnimeTitle>(items: T[], filters: SearchFilters): T[] {
  if (!filters.types.length && !filters.years.length && !filters.statuses.length && !filters.genres.length && !filters.minEpisodes) {
    return items;
  }
  return items.filter((item) => matchesFilters(item, filters));
}
