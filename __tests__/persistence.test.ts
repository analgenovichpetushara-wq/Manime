import { createProfileStore, profileActions, profileStore } from '@/store/profileStore';
import { createListsStore, listsActions, listsStore } from '@/store/listsStore';
import { createProgressStore, progressActions, progressStore } from '@/store/progressStore';
import { achievementActions, achievementsStore, createAchievementsStore } from '@/store/achievementsStore';
import { createThemeStore, themeActions, themeStore } from '@/store/themeStore';
import { createTextStore, textActions, textStore } from '@/store/textStore';
import { createSettingsStore, settingsActions, settingsStore } from '@/store/settingsStore';
import { createWatchTogetherStore, watchTogetherStore } from '@/store/watchTogetherStore';
import { buildMetricContext } from '@/features/achievements/achievementsEngine';
import { emptyCumulativeStats } from '@/data/models/progress';
import { titleFromListEntry } from '@/services/titleFactory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKey } from '@/core/storage/storage';

const title = titleFromListEntry({
  titleId: 'kodik:serial-42',
  titleName: 'Проверка сохранения',
  poster: 'https://example.invalid/p.jpg',
  providerId: 'kodik',
  categories: [],
  addedAt: 1,
  updatedAt: 1,
  genres: ['Драма'],
  refIds: [{ providerId: 'kodik', refId: '42' }],
});

/**
 * Requirement: everything the user owns must survive an application restart.
 * Each store is flushed to storage, then a brand-new store instance is created
 * and hydrated from the same storage — exactly what happens on a cold start.
 */
describe('restart persistence', () => {
  beforeEach(async () => {
    await profileStore.reset();
    await listsStore.reset();
    await progressStore.reset();
    await achievementsStore.reset();
    await themeStore.reset();
    await textStore.reset();
    await settingsStore.reset();
    await watchTogetherStore.reset();
  });

  it('restores profile identity, avatar and banner', async () => {
    profileActions.updateProfile({ username: 'kaneki', displayName: 'Ken Kaneki', bio: 'One-eyed ghoul' });
    profileActions.setAvatar('file://avatar.gif', true);
    profileActions.setBanner('file://banner.jpg', false);
    await profileStore.flush();

    const fresh = createProfileStore();
    await fresh.hydrate();
    const profile = fresh.store.getState().profile;
    expect(profile.username).toBe('kaneki');
    expect(profile.displayName).toBe('Ken Kaneki');
    expect(profile.bio).toBe('One-eyed ghoul');
    expect(profile.avatarUri).toBe('file://avatar.gif');
    expect(profile.avatarIsGif).toBe(true);
    expect(profile.bannerUri).toBe('file://banner.jpg');
  });

  it('restores favorites and watchlist categories', async () => {
    listsActions.toggleFavorite(title);
    listsActions.setCategory(title, 'watching', true);
    await listsStore.flush();

    const fresh = createListsStore();
    await fresh.hydrate();
    const entry = fresh.store.getState().entries[title.id];
    expect(entry?.categories).toEqual(expect.arrayContaining(['favorites', 'watching']));
  });

  it('moves a title between categories and keeps the change', async () => {
    listsActions.setCategory(title, 'planned', true);
    listsActions.moveTo(title.id, 'completed');
    await listsStore.flush();

    const fresh = createListsStore();
    await fresh.hydrate();
    expect(fresh.store.getState().entries[title.id]?.categories).toEqual(['completed']);
  });

  it('restores playback position for continue watching', async () => {
    progressActions.saveProgress({
      titleId: title.id,
      titleName: title.title,
      providerId: 'kodik',
      episodeId: 'ep-7',
      episodeOrdinal: 7,
      positionSec: 934,
      durationSec: 1440,
      completed: false,
      voiceoverId: 'vo-kodik',
      qualityId: '720',
      updatedAt: Date.now(),
    });
    await progressStore.flush();

    const fresh = createProgressStore();
    await fresh.hydrate();
    const entry = fresh.store.getState().entries[title.id];
    expect(entry?.positionSec).toBe(934);
    expect(entry?.episodeOrdinal).toBe(7);
    expect(entry?.voiceoverId).toBe('vo-kodik');
  });

  it('restores unlocked achievements and their timestamps', async () => {
    const context = buildMetricContext({
      stats: { ...emptyCumulativeStats(), episodesCompleted: 12, titlesCompleted: 1, distinctTitlesWithProgress: 1 },
      favorites: 1,
      bannerCount: 0,
      libraryAssetCount: 0,
      watchTogetherSessions: 0,
      themesUsed: 1,
      textsOverridden: 0,
      currentStreakDays: 1,
      longestStreakDays: 1,
    });
    achievementActions.sync(context);
    await achievementsStore.flush();
    const unlockedBefore = Object.values(achievementsStore.store.getState().states)
      .filter((state) => state.unlocked)
      .map((state) => state.id)
      .sort();
    expect(unlockedBefore.length).toBeGreaterThan(0);

    const fresh = createAchievementsStore();
    await fresh.hydrate();
    const restored = Object.values(fresh.store.getState().states).filter((state) => state.unlocked);
    expect(restored.map((state) => state.id).sort()).toEqual(unlockedBefore);
    expect(restored.every((state) => typeof state.unlockedAt === 'number')).toBe(true);
  });

  it('restores the selected theme, overrides and custom text', async () => {
    themeActions.setPresetId('glitchcore');
    themeActions.patchOverride({ colors: { accent: '#00ff9d' }, shapes: { md: 3 } });
    textActions.setText('nav.home', 'ru', 'Домой');
    await themeStore.flush();
    await textStore.flush();

    const freshTheme = createThemeStore();
    const freshText = createTextStore();
    await freshTheme.hydrate();
    await freshText.hydrate();
    expect(freshTheme.store.getState().presetId).toBe('glitchcore');
    expect(freshTheme.store.getState().override.colors?.accent).toBe('#00ff9d');
    expect(freshTheme.store.getState().override.shapes?.md).toBe(3);
    expect(freshTheme.store.getState().appliedPresets).toContain('glitchcore');
    expect(freshText.store.getState().overrides['nav.home']?.ru).toBe('Домой');
  });

  it('restores settings and language', async () => {
    settingsActions.setLanguage('en');
    settingsActions.toggleAmoled();
    settingsActions.setPlaybackSpeed(1.5);
    settingsActions.set('skipIntro', true);
    settingsActions.toggleProviderDisabled('shikimori');
    await settingsStore.flush();

    const freshSettings = createSettingsStore();
    const freshSessions = createWatchTogetherStore();
    await freshSettings.hydrate();
    await freshSessions.hydrate();
    const settings = freshSettings.store.getState();
    expect(settings.language).toBe('en');
    expect(settings.amoled).toBe(true);
    expect(settings.playbackSpeed).toBe(1.5);
    expect(settings.skipIntro).toBe(true);
    expect(settings.disabledProviderIds).toContain('shikimori');
    expect(freshSessions.store.getState().sessionsCompleted).toBe(0);
  });

  it('recovers defaults when a persisted document is corrupted', async () => {
    await AsyncStorage.setItem(storageKey('theme'), '{"version":1,"state":{"presetId"');
    const fresh = createThemeStore();
    await expect(fresh.hydrate()).resolves.toBeUndefined();
    expect(fresh.store.getState().presetId).toBeTruthy();
  });
});
