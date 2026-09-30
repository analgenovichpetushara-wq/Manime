import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';
import {
  buildMetricContext,
  progressRatio,
  statesByCategory,
  syncAchievements,
  totalProgressPercent,
  unlockedCount,
} from '@/features/achievements/achievementsEngine';
import { emptyCumulativeStats } from '@/data/models/progress';
import type { AchievementState } from '@/data/models/achievements';

function context(overrides: Partial<Parameters<typeof buildMetricContext>[0]> = {}) {
  return buildMetricContext({
    stats: emptyCumulativeStats(),
    favorites: 0,
    bannerCount: 0,
    libraryAssetCount: 0,
    watchTogetherSessions: 0,
    themesUsed: 1,
    textsOverridden: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    ...overrides,
  });
}

describe('achievement catalogue', () => {
  it('ships between 40 and 70 achievements with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(70);
    expect(new Set(ACHIEVEMENTS.map((item) => item.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('gives every achievement an icon, a target and translatable keys', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.icon.length).toBeGreaterThan(0);
      expect(achievement.target).toBeGreaterThan(0);
      expect(achievement.titleKey).toMatch(/^ach\./);
      expect(achievement.descriptionKey).toMatch(/^ach\./);
    }
  });

  it('covers every achievement category', () => {
    const categories = new Set(ACHIEVEMENTS.map((item) => item.category));
    for (const category of ['start', 'episodes', 'hours', 'streak', 'genre', 'provider', 'voiceover', 'binge', 'special']) {
      expect(categories.has(category as never)).toBe(true);
    }
  });
});

describe('achievement engine', () => {
  it('unlocks progress from real statistics only', () => {
    const before = syncAchievements({}, context());
    expect(before.states['first-launch']?.unlocked).toBe(true);
    expect(before.states['episodes-10']?.unlocked).toBe(false);

    const after = syncAchievements(
      before.states,
      context({ stats: { ...emptyCumulativeStats(), episodesCompleted: 10 } }),
    );
    expect(after.states['episodes-10']?.unlocked).toBe(true);
    expect(after.newlyUnlocked.map((state) => state.id)).toContain('episodes-10');
  });

  it('keeps unlocked achievements and their original unlock timestamp', () => {
    const first = syncAchievements({}, context({ stats: { ...emptyCumulativeStats(), episodesCompleted: 25 } }), 1_000);
    const unlockedAt = first.states['episodes-25']?.unlockedAt;
    expect(unlockedAt).toBe(1_000);

    // A later sync with no data must not revoke or re-date the unlock.
    const second = syncAchievements(first.states, context(), 9_999);
    expect(second.states['episodes-25']?.unlocked).toBe(true);
    expect(second.states['episodes-25']?.unlockedAt).toBe(1_000);
    expect(second.newlyUnlocked).toHaveLength(0);
  });

  it('never decreases recorded progress', () => {
    const rich = syncAchievements({}, context({ stats: { ...emptyCumulativeStats(), episodesCompleted: 100 } }));
    const poor = syncAchievements(rich.states, context());
    // Progress is clamped to the target but must never drop below the recorded value.
    expect(poor.states['episodes-10']?.progress).toBe(rich.states['episodes-10']?.progress);
    expect(poor.states['episodes-10']?.unlocked).toBe(true);
  });

  it('reports counts and ratios used by the UI', () => {
    const states = syncAchievements(
      {},
      context({ stats: { ...emptyCumulativeStats(), episodesCompleted: 50 }, favorites: 10, themesUsed: 7 }),
    ).states;
    expect(unlockedCount(states)).toBeGreaterThan(0);
    expect(totalProgressPercent(states)).toBeGreaterThan(0);
    expect(totalProgressPercent(states)).toBeLessThanOrEqual(100);
    const ratio = progressRatio(states['episodes-50'] as AchievementState);
    expect(ratio).toBeGreaterThan(0.9);
    const grouped = statesByCategory(states);
    expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(9);
    expect(grouped.episodes?.length).toBeGreaterThan(5);
  });

  it('groups and reports every achievement exactly once', () => {
    const states = syncAchievements({}, context()).states;
    const grouped = statesByCategory(states);
    const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(ACHIEVEMENTS.length);
  });

  it('counts feature usage such as banners, library items, themes and shared sessions', () => {
    const states = syncAchievements(
      {},
      context({ bannerCount: 5, libraryAssetCount: 10, themesUsed: 7, textsOverridden: 10, watchTogetherSessions: 1 }),
    ).states;
    expect(states['banner-artist']?.unlocked).toBe(true);
    expect(states['banner-collector']?.unlocked).toBe(true);
    expect(states['librarian']?.unlocked).toBe(true);
    expect(states['theme-collector']?.unlocked).toBe(true);
    expect(states['watch-buddy']?.unlocked).toBe(true);
  });
});
