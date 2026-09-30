import { buildMetricContext } from '@/features/achievements/achievementsEngine';
import { achievementActions, useAchievementsStore } from '@/store/achievementsStore';
import { useProgressStore } from '@/store/progressStore';
import { useListsStore } from '@/store/listsStore';
import { useBannersStore, useLibraryStore } from '@/store/collectionsStores';
import { useTextStore } from '@/store/textStore';
import { useThemeStore } from '@/store/themeStore';
import { useWatchTogetherStore } from '@/store/watchTogetherStore';

/**
 * Recomputes achievement progress from real, stored usage data.
 * Called after watch events and after customization changes.
 */
export function syncAchievements(): string[] {
  const progress = useProgressStore.getState();
  const lists = useListsStore.getState();
  const banners = useBannersStore.getState();
  const library = useLibraryStore.getState();
  const theme = useThemeStore.getState();
  const text = useTextStore.getState();
  const watchTogether = useWatchTogetherStore.getState();

  const favorites = Object.values(lists.entries).filter((entry) => entry.categories.includes('favorites')).length;

  const context = buildMetricContext({
    stats: progress.stats,
    favorites,
    bannerCount: banners.banners.length,
    libraryAssetCount: library.assets.length,
    watchTogetherSessions: watchTogether.sessionsCompleted,
    themesUsed: theme.appliedPresets.length,
    textsOverridden: Object.keys(text.overrides).length,
    currentStreakDays: progress.currentStreak,
    longestStreakDays: progress.longestStreak,
  });

  const previous = useAchievementsStore.getState().states;
  achievementActions.sync(context, previous);
  const updated = useAchievementsStore.getState();
  return Object.values(updated.states)
    .filter((state) => state.unlocked && !previous[state.id]?.unlocked)
    .map((state) => state.id);
}
