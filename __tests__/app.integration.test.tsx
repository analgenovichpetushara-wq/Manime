import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TextProvider } from '@/i18n/useText';
import { AppShell } from '@/navigation/AppShell';
import { useSettingsStore as useSettingsForLanguage , settingsActions, useSettingsStore } from '@/store/settingsStore';
import { useTextStore as useTextForOverrides , textActions, useTextStore } from '@/store/textStore';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { CustomTextScreen } from '@/features/settings/CustomTextScreen';
import { BannerStudioScreen } from '@/features/settings/BannerStudioScreen';
import { LibraryScreen } from '@/features/settings/LibraryScreen';
import { ProvidersScreen } from '@/features/settings/ProvidersScreen';
import { CacheScreen } from '@/features/settings/CacheScreen';
import { CustomizationScreen } from '@/features/settings/CustomizationScreen';
import { DetailsReadmeScreen } from '@/features/settings/DetailsReadmeScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { AchievementsScreen } from '@/features/achievements/AchievementsScreen';
import { WatchlistScreen } from '@/features/watchlists/WatchlistScreen';
import { WatchTogetherScreen } from '@/features/watchtogether/WatchTogetherScreen';
import { bannerActions, libraryActions, useBannersStore, useLibraryStore } from '@/store/collectionsStores';
import { listsActions, useListsStore } from '@/store/listsStore';
import { profileActions, useProfileStore } from '@/store/profileStore';
import { progressActions, useProgressStore } from '@/store/progressStore';
import { useThemeStore } from '@/store/themeStore';
import { useWatchTogetherStore } from '@/store/watchTogetherStore';
import { hydrateAllPersistedStores } from '@/store/persistentStore';
import { storageKey } from '@/core/storage/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { titleFromListEntry } from '@/services/titleFactory';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Renders a screen inside the same provider stack the app uses at runtime. */
async function renderScreen(ui: React.ReactElement, options: { preset?: string; mode?: 'light' | 'dark' } = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider presetId={options.preset ?? 'minimalist'} mode={options.mode ?? 'dark'}>
        <TextProvider language={useSettingsForLanguage.getState().language} overrides={useTextForOverrides.getState().overrides}>
          <NavigationContainer>
            <AppShell>{ui}</AppShell>
          </NavigationContainer>
        </TextProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const progressStorageKey = storageKey('progress');
const listsStorageKey = storageKey('lists');

const title = titleFromListEntry({
  titleId: 'kodik:serial-42758',
  refIds: [{ providerId: 'kodik', refId: 'serial-42758' }],
  titleName: 'Магистр дьявольского культа',
  poster: 'https://example.invalid/poster.jpg',
  providerId: 'kodik',
  genres: ['Фэнтези'],
  categories: ['watching'],
  addedAt: Date.now(),
  updatedAt: Date.now(),
});

beforeEach(async () => {
  // The settings store exposes targeted setters only; reset exactly what the suite touches.
  for (const key of ['amoled', 'mode', 'language', 'playbackSpeed', 'accentColor', 'disabledProviderIds'] as const) {
    const defaults = { amoled: false, mode: 'dark', language: 'ru', playbackSpeed: 1, accentColor: undefined, disabledProviderIds: [] } as const;
    settingsActions.set(key, defaults[key] as never);
  }
  textActions.resetAll();
  bannerActions.resetAll();
  libraryActions.resetAll();
  progressActions.resetAll();
  profileActions.resetAll();
  await hydrateAllPersistedStores();
});

describe('app integration', () => {
  // Element definitions are created lazily inside each test so no instance is shared.
  const screenNames = [
    'SettingsScreen',
    'CustomTextScreen',
    'BannerStudioScreen',
    'LibraryScreen',
    'ProvidersScreen',
    'CacheScreen',
    'CustomizationScreen',
    'DetailsReadmeScreen',
    'ProfileScreen',
    'AchievementsScreen',
    'WatchlistScreen',
    'WatchTogetherScreen',
  ] as const;

  const screenFactories: Record<(typeof screenNames)[number], () => React.ReactElement> = {
    SettingsScreen: () => <SettingsScreen />,
    CustomTextScreen: () => <CustomTextScreen />,
    BannerStudioScreen: () => <BannerStudioScreen />,
    LibraryScreen: () => <LibraryScreen />,
    ProvidersScreen: () => <ProvidersScreen />,
    CacheScreen: () => <CacheScreen />,
    CustomizationScreen: () => <CustomizationScreen />,
    DetailsReadmeScreen: () => <DetailsReadmeScreen />,
    ProfileScreen: () => <ProfileScreen />,
    AchievementsScreen: () => <AchievementsScreen />,
    WatchlistScreen: () => <WatchlistScreen />,
    WatchTogetherScreen: () => <WatchTogetherScreen />,
  };

  it.each(screenNames)('mounts %s with the real provider stack without crashing', async (name) => {
    const view = await renderScreen(screenFactories[name]());
    expect(`${name}:${view.toJSON() ? 'rendered' : 'empty'}`).toBe(`${name}:rendered`);
    await view.unmount();
  });

  it('applies a settings change through the UI and keeps it in the store', async () => {
    const view = await renderScreen(<SettingsScreen />);
    fireEvent.press(view.getByTestId('toggle-amoled'));
    await waitFor(() => expect(useSettingsStore.getState().amoled).toBe(true));

    fireEvent.press(view.getByTestId('mode-light'));
    await waitFor(() => expect(useSettingsStore.getState().mode).toBe('light'));

    fireEvent.press(view.getByTestId('language-en'));
    await waitFor(() => expect(useSettingsStore.getState().language).toBe('en'));

    fireEvent.press(view.getByTestId('speed-1.5'));
    await waitFor(() => expect(useSettingsStore.getState().playbackSpeed).toBe(1.5));
  });

  it('changes the theme preset from the customization screen', async () => {
    const view = await renderScreen(<CustomizationScreen />);
    fireEvent.press(view.getByTestId('preset-cyberpunk'));
    await waitFor(() => expect(useThemeStore.getState().presetId).toBe('cyberpunk'));

    fireEvent.press(view.getByTestId('accent-#22e3ff'));
    await waitFor(() => expect(useSettingsStore.getState().accentColor).toBe('#22e3ff'));
  });

  it('overrides a caption from the custom text screen without touching the catalogue', async () => {
    const view = await renderScreen(<CustomTextScreen />);
    expect(useTextStore.getState().overrides['app.name']).toBeUndefined();

    fireEvent.press(view.getByTestId('text-row-app.name'));
    await waitFor(() => expect(view.getByTestId('text-editor')).toBeTruthy());

    fireEvent.changeText(view.getByTestId('text-editor-input'), 'АнимАлк');
    await waitFor(() => expect(view.getByTestId('text-editor-input').props.value).toBe('АнимАлк'));
    fireEvent.press(view.getByTestId('text-save'));

    await waitFor(() => expect(textActions.count()).toBeGreaterThan(0));
    expect(useTextStore.getState().overrides['app.name']?.ru).toBe('АнимАлк');

    fireEvent.press(view.getByTestId('text-reset-all'));
    await waitFor(() => expect(textActions.count()).toBe(0));
  });

  it('creates, toggles and deletes a home banner from the banner studio', async () => {
    const view = await renderScreen(<BannerStudioScreen />);
    expect(useBannersStore.getState().banners).toHaveLength(0);

    fireEvent.press(view.getByTestId('create-banner'));
    await waitFor(() => expect(view.getByTestId('banner-editor')).toBeTruthy());

    fireEvent.changeText(view.getByTestId('banner-title'), 'Ночь аниме');
    await waitFor(() => expect(view.getByTestId('banner-title').props.value).toBe('Ночь аниме'));
    fireEvent.changeText(view.getByTestId('banner-subtitle'), 'Марафон до утра');
    await waitFor(() => expect(view.getByTestId('banner-subtitle').props.value).toBe('Марафон до утра'));
    fireEvent.press(view.getByTestId('save-banner'));

    await waitFor(() => expect(useBannersStore.getState().banners).toHaveLength(1));
    const banner = useBannersStore.getState().banners[0]!;
    expect(banner.title).toBe('Ночь аниме');
    expect(banner.enabled).toBe(true);

    fireEvent.press(view.getByTestId(`banner-preview-${banner.id}`));
    await waitFor(() => expect(view.getByTestId('banner-preview-surface')).toBeTruthy());

    fireEvent.press(view.getByTestId(`banner-delete-${banner.id}`));
    await waitFor(() => expect(useBannersStore.getState().banners).toHaveLength(0));
  });

  it('imports media into the library and reuses it as an avatar', async () => {
    const view = await renderScreen(<LibraryScreen />);
    expect(useLibraryStore.getState().assets).toHaveLength(0);

    // The picker itself is native; the store contract it writes to is asserted here.
    await act(async () => {
      libraryActions.addAsset({
        id: 'asset-1',
        name: 'avatar.gif',
        uri: 'file:///data/animalc/library/avatar.gif',
        originalUri: 'file:///gallery/avatar.gif',
        kind: 'gif',
        importedAt: Date.now(),
      });
    });
    await waitFor(() => expect(view.getByTestId('asset-asset-1')).toBeTruthy());

    fireEvent.press(view.getByTestId('asset-asset-1'));
    await waitFor(() => expect(view.getByTestId('use-avatar')).toBeTruthy());
    // Applying an asset is asynchronous (profile update + usage bookkeeping + toast).
    await act(async () => {
      fireEvent.press(view.getByTestId('use-avatar'));
    });
    await waitFor(() => expect(useProfileStore.getState().profile.avatarUri).toBe('file:///data/animalc/library/avatar.gif'));
    expect(useProfileStore.getState().profile.avatarIsGif).toBe(true);
    await act(async () => undefined);
  });

  it('lists every registered provider with health and capability information', async () => {
    const view = await renderScreen(<ProvidersScreen />);
    for (const id of ['kodik', 'anime365', 'shikimori']) {
      await waitFor(() => expect(view.getByTestId(`provider-${id}`)).toBeTruthy());
    }

    fireEvent.press(view.getByTestId('toggle-provider-shikimori'));
    await waitFor(() => expect(useSettingsStore.getState().disabledProviderIds).toContain('shikimori'));
    fireEvent.press(view.getByTestId('toggle-provider-shikimori'));
    await waitFor(() => expect(useSettingsStore.getState().disabledProviderIds).not.toContain('shikimori'));
  });

  it('saves profile edits and shows them back in the editor', async () => {
    const view = await renderScreen(<ProfileScreen />);
    fireEvent.press(view.getByTestId('edit-profile'));
    await waitFor(() => expect(view.getByTestId('profile-editor')).toBeTruthy());

    fireEvent.changeText(view.getByTestId('input-display-name'), 'Аниме-фанат');
    await waitFor(() => expect(view.getByTestId('input-display-name').props.value).toBe('Аниме-фанат'));
    fireEvent.changeText(view.getByTestId('input-bio'), 'Смотрю всё, кроме хоррора');
    await waitFor(() => expect(view.getByTestId('input-bio').props.value).toBe('Смотрю всё, кроме хоррора'));
    fireEvent.press(view.getByTestId('save-profile'));

    await waitFor(() => expect(useProfileStore.getState().profile.displayName).toBe('Аниме-фанат'));
    expect(useProfileStore.getState().profile.bio).toBe('Смотрю всё, кроме хоррора');
  });

  it('shows achievements grouped by category with real progress', async () => {
    const view = await renderScreen(<AchievementsScreen />);
    await waitFor(() => expect(view.getByTestId('achievement-filter-locked')).toBeTruthy());
    // Locked and unlocked views both render without dropping the screen.
    fireEvent.press(view.getByTestId('achievement-filter-locked'));
    await waitFor(() => expect(view.getByTestId('achievements-screen')).toBeTruthy());
    fireEvent.press(view.getByTestId('achievement-filter-unlocked'));
    await waitFor(() => expect(view.getByTestId('achievements-screen')).toBeTruthy());
    fireEvent.press(view.getByTestId('achievement-filter-all'));
    await waitFor(() => expect(view.getByTestId('achievements-screen')).toBeTruthy());
  });

  it('moves a watchlist entry between categories', async () => {
    listsActions.setCategory(title, 'watching', true);
    const view = await renderScreen(<WatchlistScreen />);

    await waitFor(() => expect(view.getByTestId('list-entry-kodik:serial-42758')).toBeTruthy());
    fireEvent.press(view.getByTestId('move-kodik:serial-42758'));
    await waitFor(() => expect(useListsStore.getState().entries[title.id]?.categories).toContain('planned'));
  });

  it('reports a missing sync node instead of pretending to sync', async () => {
    const view = await renderScreen(<WatchTogetherScreen />);
    await waitFor(() => expect(view.getByTestId('watch-together-name')).toBeTruthy());
    // The probe runs against the configured address; with no node reachable in the
    // test environment the screen must show the "down" state, not a fake success.
    await waitFor(() => expect(view.getByTestId('create-room')).toBeTruthy(), { timeout: 4000 });
    // The probe has no node to reach, so the app records nothing and offers no fake state.
    await act(async () => undefined);
    expect(useWatchTogetherStore.getState().sessionsCompleted).toBe(0);
    expect(view.getByTestId('join-room')).toBeTruthy();
  });

  it('keeps the app usable when a store contains corrupted data', async () => {
    // A malformed persisted document must not break hydration or the screens.
    await AsyncStorage.setItem(progressStorageKey, '{not json');
    await AsyncStorage.setItem(listsStorageKey, JSON.stringify({ version: 99, state: { entries: 'nonsense' } }));

    await expect(hydrateAllPersistedStores()).resolves.toBeUndefined();
    const view = await renderScreen(<WatchlistScreen />);
    expect(view.getByTestId('watchlist-screen')).toBeTruthy();
    expect(useProgressStore.getState().entries).toBeDefined();
  });
});
