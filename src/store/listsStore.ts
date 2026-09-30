import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import { WATCHLIST_CATEGORIES, type WatchlistCategory } from '@/data/models/progress';
import type { AnimeTitle } from '@/data/models/anime';

export interface StoredListEntry {
  titleId: string;
  titleName: string;
  poster?: string;
  providerId: string;
  categories: WatchlistCategory[];
  addedAt: number;
  updatedAt: number;
  episodesWatched?: number;
  episodesTotal?: number;
  genres: string[];
  refIds: { providerId: string; refId: string }[];
}

export interface ListsState {
  entries: Record<string, StoredListEntry>;
  toggleFavorite: (title: AnimeTitle) => boolean;
  setCategory: (title: AnimeTitle, category: WatchlistCategory, enabled: boolean) => void;
  moveTo: (titleId: string, category: WatchlistCategory) => void;
  remove: (titleId: string) => void;
  resetAll: () => void;
}

const defaults: ListsState = {
  entries: {},
  toggleFavorite: () => false,
  setCategory: () => undefined,
  moveTo: () => undefined,
  remove: () => undefined,
  resetAll: () => undefined,
};

export function createListsStore() {
  return createPersistedStore<ListsState>(defaults, {
    namespace: StorageKeys.watchlists,
    version: 1,
    partialize: (state) => ({ entries: state.entries }),
  });
}

export const listsStore = createListsStore();

export const useListsStore = listsStore.store;

function toEntry(title: AnimeTitle, previous?: StoredListEntry): StoredListEntry {
  const now = Date.now();
  return {
    titleId: title.id,
    titleName: title.title,
    poster: title.poster,
    providerId: title.providerId,
    categories: previous?.categories ?? [],
    addedAt: previous?.addedAt ?? now,
    updatedAt: now,
    episodesWatched: previous?.episodesWatched,
    episodesTotal: title.episodesTotal ?? previous?.episodesTotal,
    genres: title.genres,
    refIds: title.providerRefs.length ? title.providerRefs.map((ref) => ({ ...ref })) : [{ providerId: title.providerId, refId: title.refId }],
  };
}

export const listsActions = {
  toggleFavorite: (title: AnimeTitle): boolean => {
    let nowFavorite = false;
    useListsStore.setState((state) => {
      const previous = state.entries[title.id];
      const entry = toEntry(title, previous);
      const isFavorite = previous?.categories.includes('favorites') ?? false;
      nowFavorite = !isFavorite;
      entry.categories = isFavorite
        ? entry.categories.filter((category) => category !== 'favorites')
        : [...entry.categories, 'favorites'];
      const entries = { ...state.entries };
      if (entry.categories.length === 0) delete entries[title.id];
      else entries[title.id] = entry;
      return { entries };
    });
    return nowFavorite;
  },

  setCategory: (title: AnimeTitle, category: WatchlistCategory, enabled: boolean) =>
    useListsStore.setState((state) => {
      const previous = state.entries[title.id];
      const entry = toEntry(title, previous);
      const has = entry.categories.includes(category);
      if (enabled && !has) entry.categories = [...entry.categories, category];
      if (!enabled && has) entry.categories = entry.categories.filter((item) => item !== category);
      const entries = { ...state.entries };
      if (entry.categories.length === 0) delete entries[title.id];
      else entries[title.id] = entry;
      return { entries };
    }),

  /** Moves an entry between the exclusive progress categories, keeping favourites. */
  moveTo: (titleId: string, category: WatchlistCategory) =>
    useListsStore.setState((state) => {
      const previous = state.entries[titleId];
      if (!previous) return state;
      const keepFavorites = previous.categories.includes('favorites');
      const keepExclusive = previous.categories.filter((item) => item !== 'favorites');
      const categories: WatchlistCategory[] =
        category === 'favorites'
          ? [...keepExclusive, 'favorites']
          : [...(keepFavorites ? (['favorites'] as WatchlistCategory[]) : []), category];
      return {
        entries: {
          ...state.entries,
          [titleId]: { ...previous, categories: [...new Set(categories)], updatedAt: Date.now() },
        },
      };
    }),

  remove: (titleId: string) =>
    useListsStore.setState((state) => {
      const entries = { ...state.entries };
      delete entries[titleId];
      return { entries };
    }),

  resetAll: () => listsStore.reset(),
};

export function entriesInCategory(state: ListsState, category: WatchlistCategory): StoredListEntry[] {
  return Object.values(state.entries)
    .filter((entry) => entry.categories.includes(category))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function isFavorite(state: ListsState, titleId: string): boolean {
  return state.entries[titleId]?.categories.includes('favorites') ?? false;
}

export function categoryOf(state: ListsState, titleId: string): WatchlistCategory | undefined {
  const entry = state.entries[titleId];
  if (!entry) return undefined;
  return WATCHLIST_CATEGORIES.find((category) => entry.categories.includes(category));
}
