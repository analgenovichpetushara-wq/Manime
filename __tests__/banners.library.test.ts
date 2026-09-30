import {
  assetById,
  bannerActions,
  bannersStore,
  createBannersStore,
  createLibraryStore,
  enabledBanners,
  libraryActions,
  libraryStore,
} from '@/store/collectionsStores';
import { flushAllPersistedStores } from '@/store/persistentStore';
import type { LibraryAsset } from '@/data/models/library';

const imageUri = 'file:///data/animalc/library/asset-1.jpg';

function asset(overrides: Partial<LibraryAsset> = {}): LibraryAsset {
  return {
    id: overrides.id ?? 'asset-1',
    name: 'poster.jpg',
    uri: imageUri,
    originalUri: 'file:///gallery/poster.jpg',
    kind: 'image',
    importedAt: Date.now(),
    ...overrides,
  };
}

describe('custom home banners', () => {
  beforeEach(() => {
    bannerActions.resetAll();
  });

  it('creates, edits and deletes a banner', () => {
    const banner = bannerActions.createBanner({ title: 'Мой баннер', subtitle: 'Подзаголовок', imageUri });
    expect(bannersStore.store.getState().banners).toHaveLength(1);

    bannerActions.updateBanner(banner.id, { subtitle: 'Новый подзаголовок' });
    expect(bannersStore.store.getState().banners[0]?.subtitle).toBe('Новый подзаголовок');

    bannerActions.deleteBanner(banner.id);
    expect(bannersStore.store.getState().banners).toHaveLength(0);
  });

  it('keeps the image untouched when banner text is edited', () => {
    const banner = bannerActions.createBanner({ title: 'До', imageUri, assetId: 'asset-1', isGif: true });
    bannerActions.updateBanner(banner.id, { title: 'После', subtitle: 'Другая подпись' });
    const updated = bannersStore.store.getState().banners[0]!;
    expect(updated.title).toBe('После');
    expect(updated.imageUri).toBe(imageUri);
    expect(updated.assetId).toBe('asset-1');
    expect(updated.isGif).toBe(true);
  });

  it('reorders banners and normalises the stored order', () => {
    const first = bannerActions.createBanner({ title: '1' });
    const second = bannerActions.createBanner({ title: '2' });
    const third = bannerActions.createBanner({ title: '3' });
    expect([first.order, second.order, third.order]).toEqual([0, 1, 2]);

    bannerActions.moveBanner(third.id, -1);
    expect(bannersStore.store.getState().banners.map((banner) => banner.title)).toEqual(['1', '3', '2']);
    expect(bannersStore.store.getState().banners.map((banner) => banner.order)).toEqual([0, 1, 2]);

    // Moving past the edge is a no-op rather than an error.
    bannerActions.moveBanner(first.id, -1);
    expect(bannersStore.store.getState().banners[0]?.title).toBe('1');
  });

  it('enables and disables banners for the home screen', () => {
    const visible = bannerActions.createBanner({ title: 'visible' });
    const hidden = bannerActions.createBanner({ title: 'hidden' });
    bannerActions.toggleBanner(hidden.id);
    const enabled = enabledBanners(bannersStore.store.getState());
    expect(enabled.map((banner) => banner.id)).toEqual([visible.id]);
  });

  it('persists banners across a restart', async () => {
    bannerActions.createBanner({ id: 'restart-banner', title: 'Живой баннер', imageUri });
    await flushAllPersistedStores();
    const fresh = createBannersStore();
    await fresh.hydrate();
    expect(fresh.store.getState().banners[0]?.title).toBe('Живой баннер');
    expect(fresh.store.getState().banners[0]?.imageUri).toBe(imageUri);
  });
});

describe('local media library', () => {
  beforeEach(() => {
    libraryActions.resetAll();
  });

  it('stores asset metadata and marks how each asset is used', () => {
    const stored = libraryActions.addAsset(asset());
    expect(libraryActions.addAsset(asset({ id: 'asset-2', name: 'cover.gif', kind: 'gif' }))).toBeDefined();

    libraryActions.markUsage(stored.id, 'avatar', true);
    libraryActions.markUsage(stored.id, 'banner', true);
    const updated = assetById(libraryStore.store.getState(), stored.id);
    expect(updated?.usedAsAvatar).toBe(true);
    expect(updated?.usedAsBanner).toBe(true);
    expect(updated?.usedAsBackground).toBeUndefined();
    expect(libraryStore.store.getState().assets).toHaveLength(2);
  });

  it('keeps the original file reference so user media is never rewritten', () => {
    const stored = libraryActions.addAsset(asset({ id: 'keep-original' }));
    expect(stored.uri).toBe(imageUri);
    expect(stored.originalUri).toBe('file:///gallery/poster.jpg');
  });

  it('deletes only the requested asset', () => {
    libraryActions.addAsset(asset({ id: 'a1' }));
    libraryActions.addAsset(asset({ id: 'a2' }));
    libraryActions.removeAsset('a1');
    expect(libraryStore.store.getState().assets.map((item) => item.id)).toEqual(['a2']);
  });

  it('persists the library across a restart', async () => {
    libraryActions.addAsset(asset({ id: 'restart-asset', name: 'avatar.gif', kind: 'gif' }));
    await flushAllPersistedStores();
    const fresh = createLibraryStore();
    await fresh.hydrate();
    const restored = fresh.store.getState().assets.find((item) => item.id === 'restart-asset');
    expect(restored?.kind).toBe('gif');
    expect(restored?.name).toBe('avatar.gif');
  });
});
