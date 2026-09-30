import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import type { HomeBanner } from '@/data/models/banner';
import type { LibraryAsset } from '@/data/models/library';
import { createId } from '@/core/utils/id';

/* ------------------------------------------------------------------ banners */

export interface BannersState {
  banners: HomeBanner[];
  createBanner: (input: Partial<HomeBanner>) => HomeBanner;
  updateBanner: (id: string, patch: Partial<HomeBanner>) => void;
  deleteBanner: (id: string) => void;
  moveBanner: (id: string, direction: -1 | 1) => void;
  toggleBanner: (id: string) => void;
  resetAll: () => void;
}

const bannerDefaults: BannersState = {
  banners: [],
  createBanner: () => ({}) as HomeBanner,
  updateBanner: () => undefined,
  deleteBanner: () => undefined,
  moveBanner: () => undefined,
  toggleBanner: () => undefined,
  resetAll: () => undefined,
};

export function createBannersStore() {
  return createPersistedStore<BannersState>(bannerDefaults, {
    namespace: StorageKeys.banners,
    version: 1,
    partialize: (state) => ({ banners: state.banners }),
  });
}

export const bannersStore = createBannersStore();
export const useBannersStore = bannersStore.store;

function normalizeOrder(banners: HomeBanner[]): HomeBanner[] {
  return banners
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((banner, index) => ({ ...banner, order: index }));
}

export const bannerActions = {
  createBanner: (input: Partial<HomeBanner>): HomeBanner => {
    const now = Date.now();
    const banner: HomeBanner = {
      id: input.id ?? createId('banner'),
      title: input.title ?? '',
      subtitle: input.subtitle,
      body: input.body,
      assetId: input.assetId,
      imageUri: input.imageUri,
      isGif: input.isGif ?? false,
      backgroundColor: input.backgroundColor,
      textColor: input.textColor,
      alignment: input.alignment ?? 'left',
      overlay: input.overlay ?? 'gradient',
      action: input.action,
      enabled: input.enabled ?? true,
      order: input.order ?? bannersStore.store.getState().banners.length,
      createdAt: now,
      updatedAt: now,
    };
    bannersStore.store.setState((state) => ({ banners: normalizeOrder([...state.banners, banner]) }));
    return banner;
  },
  updateBanner: (id: string, patch: Partial<HomeBanner>) =>
    bannersStore.store.setState((state) => ({
      banners: normalizeOrder(
        state.banners.map((banner) => (banner.id === id ? { ...banner, ...patch, updatedAt: Date.now() } : banner)),
      ),
    })),
  deleteBanner: (id: string) =>
    bannersStore.store.setState((state) => ({ banners: normalizeOrder(state.banners.filter((banner) => banner.id !== id)) })),
  moveBanner: (id: string, direction: -1 | 1) =>
    bannersStore.store.setState((state) => {
      const ordered = normalizeOrder(state.banners);
      const index = ordered.findIndex((banner) => banner.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= ordered.length) return { banners: ordered };
      const next = [...ordered];
      const [moved] = next.splice(index, 1);
      if (!moved) return { banners: ordered };
      next.splice(target, 0, moved);
      // Re-index explicitly: the moved banner still carries its old order value,
      // so sorting by `order` would undo the move.
      return { banners: next.map((banner, position) => ({ ...banner, order: position })) };
    }),
  toggleBanner: (id: string) =>
    bannersStore.store.setState((state) => ({
      banners: state.banners.map((banner) =>
        banner.id === id ? { ...banner, enabled: !banner.enabled, updatedAt: Date.now() } : banner,
      ),
    })),
  resetAll: () => bannersStore.reset(),
};

export function enabledBanners(state: BannersState): HomeBanner[] {
  return normalizeOrder(state.banners).filter((banner) => banner.enabled);
}

/* ------------------------------------------------------------------ library */

export interface LibraryState {
  assets: LibraryAsset[];
  addAsset: (asset: Omit<LibraryAsset, 'id' | 'importedAt'> & Partial<Pick<LibraryAsset, 'id' | 'importedAt'>>) => LibraryAsset;
  removeAsset: (id: string) => void;
  markUsage: (id: string, usage: 'avatar' | 'banner' | 'background', value: boolean) => void;
  renameAsset: (id: string, name: string) => void;
  resetAll: () => void;
}

const libraryDefaults: LibraryState = {
  assets: [],
  addAsset: () => ({}) as LibraryAsset,
  removeAsset: () => undefined,
  markUsage: () => undefined,
  renameAsset: () => undefined,
  resetAll: () => undefined,
};

export function createLibraryStore() {
  return createPersistedStore<LibraryState>(libraryDefaults, {
    namespace: StorageKeys.library,
    version: 1,
    partialize: (state) => ({ assets: state.assets }),
  });
}

export const libraryStore = createLibraryStore();
export const useLibraryStore = libraryStore.store;

export const libraryActions = {
  addAsset: (asset: Omit<LibraryAsset, 'id' | 'importedAt'> & Partial<Pick<LibraryAsset, 'id' | 'importedAt'>>): LibraryAsset => {
    const full: LibraryAsset = {
      ...asset,
      id: asset.id ?? createId('asset'),
      importedAt: asset.importedAt ?? Date.now(),
    };
    libraryStore.store.setState((state) => ({ assets: [full, ...state.assets] }));
    return full;
  },
  removeAsset: (id: string) =>
    libraryStore.store.setState((state) => ({ assets: state.assets.filter((asset) => asset.id !== id) })),
  markUsage: (id: string, usage: 'avatar' | 'banner' | 'background', value: boolean) =>
    libraryStore.store.setState((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === id
          ? {
              ...asset,
              usedAsAvatar: usage === 'avatar' ? value : asset.usedAsAvatar,
              usedAsBanner: usage === 'banner' ? value : asset.usedAsBanner,
              usedAsBackground: usage === 'background' ? value : asset.usedAsBackground,
            }
          : asset,
      ),
    })),
  renameAsset: (id: string, name: string) =>
    libraryStore.store.setState((state) => ({
      assets: state.assets.map((asset) => (asset.id === id ? { ...asset, name } : asset)),
    })),
  resetAll: () => libraryStore.reset(),
};

export function assetById(state: LibraryState, id?: string): LibraryAsset | undefined {
  if (!id) return undefined;
  return state.assets.find((asset) => asset.id === id);
}
