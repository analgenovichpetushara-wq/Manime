import type { AchievementMetricContext, AchievementState } from '@/data/models/achievements';
import type { CumulativeWatchStats } from '@/data/models/progress';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';

export interface AchievementEngineInput {
  stats: CumulativeWatchStats;
  favorites: number;
  bannerCount: number;
  libraryAssetCount: number;
  watchTogetherSessions: number;
  themesUsed: number;
  textsOverridden: number;
  currentStreakDays: number;
  longestStreakDays: number;
}

export function buildMetricContext(input: AchievementEngineInput): AchievementMetricContext {
  const { stats } = input;
  return {
    episodesCompleted: stats.episodesCompleted,
    titlesCompleted: stats.titlesCompleted,
    hoursWatched: Math.floor(stats.secondsWatched / 3600),
    secondsWatched: stats.secondsWatched,
    currentStreakDays: input.currentStreakDays,
    longestStreakDays: Math.max(input.longestStreakDays, input.currentStreakDays),
    nightEpisodes: stats.nightEpisodes,
    maximumEpisodesInADay: stats.maximumEpisodesInADay,
    maximumEpisodesInAWeek: stats.maximumEpisodesInAWeek,
    distinctGenres: stats.distinctGenres,
    distinctProviders: stats.distinctProviders,
    distinctVoiceoverKinds: stats.distinctVoiceoverKinds,
    genreCount: (genre: string) => stats.genresWatched[genre] ?? 0,
    providerCount: (providerId: string) => stats.providersUsed[providerId] ?? 0,
    voiceoverCount: (kind: string) => stats.voiceoverKindsUsed[kind] ?? 0,
    favorites: input.favorites,
    bannerCount: input.bannerCount,
    libraryAssetCount: input.libraryAssetCount,
    watchTogetherSessions: input.watchTogetherSessions,
    themesUsed: input.themesUsed,
    textsOverridden: input.textsOverridden,
    subtitleEpisodes: stats.subtitleEpisodes,
  };
}

export interface AchievementSyncResult {
  states: Record<string, AchievementState>;
  newlyUnlocked: AchievementState[];
}

/**
 * Recomputes progress for every achievement from the real metric context.
 * Already unlocked achievements keep their original unlock date.
 */
export function syncAchievements(
  previous: Record<string, AchievementState>,
  context: AchievementMetricContext,
  now = Date.now(),
): AchievementSyncResult {
  const states: Record<string, AchievementState> = {};
  const newlyUnlocked: AchievementState[] = [];

  for (const definition of ACHIEVEMENTS) {
    const existing = previous[definition.id];
    const rawProgress = definition.progress(context);
    const progress = Math.max(existing?.progress ?? 0, Number.isFinite(rawProgress) ? rawProgress : 0);
    const unlocked = existing?.unlocked === true || progress >= definition.target;
    const state: AchievementState = {
      id: definition.id,
      progress: Math.min(progress, definition.target),
      target: definition.target,
      unlocked,
      unlockedAt: existing?.unlockedAt ?? (unlocked ? now : undefined),
      claimedReward: existing?.claimedReward,
    };
    states[definition.id] = state;
    if (unlocked && !existing?.unlocked) newlyUnlocked.push(state);
  }

  return { states, newlyUnlocked };
}

export function unlockedCount(states: Record<string, AchievementState>): number {
  return Object.values(states).filter((state) => state.unlocked).length;
}

export function totalProgressPercent(states: Record<string, AchievementState>): number {
  const target = ACHIEVEMENTS.reduce((sum, definition) => sum + definition.target, 0);
  const progress = Object.values(states).reduce((sum, state) => sum + Math.min(state.progress, state.target), 0);
  return target === 0 ? 0 : Math.round((progress / target) * 100);
}

export function progressRatio(state: AchievementState): number {
  if (state.target <= 0) return 1;
  return Math.max(0, Math.min(1, state.progress / state.target));
}

export function statesByCategory(
  states: Record<string, AchievementState>,
): Record<string, { definition: (typeof ACHIEVEMENTS)[number]; state: AchievementState }[]> {
  const out: Record<string, { definition: (typeof ACHIEVEMENTS)[number]; state: AchievementState }[]> = {};
  for (const definition of ACHIEVEMENTS) {
    const state = states[definition.id] ?? {
      id: definition.id,
      progress: 0,
      target: definition.target,
      unlocked: false,
    };
    (out[definition.category] ??= []).push({ definition, state });
  }
  return out;
}
