import type { CumulativeWatchStats, WatchProgress } from '@/data/models/progress';
import { emptyCumulativeStats } from '@/data/models/progress';
import { dayKey, startOfDay } from '@/core/utils/time';

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDay?: string;
}

/** Streak derived from the set of days with at least one completed episode. */
export function computeStreak(activeDays: string[], now = Date.now()): StreakInfo {
  const unique = [...new Set(activeDays)].sort();
  if (!unique.length) return { current: 0, longest: 0, lastActiveDay: undefined };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const previous = unique[index - 1];
    const current = unique[index];
    if (!previous || !current) continue;
    if (isNextDay(previous, current)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = dayKey(now);
  const yesterday = dayKey(now - 86_400_000);
  const lastActive = unique[unique.length - 1];
  let current = 0;
  if (lastActive === today || lastActive === yesterday) {
    current = 1;
    for (let index = unique.length - 1; index > 0; index -= 1) {
      const previous = unique[index - 1];
      const currentDay = unique[index];
      if (previous && currentDay && isNextDay(previous, currentDay)) current += 1;
      else break;
    }
  }

  return { current, longest, lastActiveDay: lastActive };
}

function isNextDay(previousKey: string, currentKey: string): boolean {
  const previousDate = new Date(`${previousKey}T00:00:00`);
  const nextDate = new Date(previousDate.getTime() + 86_400_000);
  return dayKey(nextDate.getTime()) === currentKey;
}

export interface CompletionEvent {
  providerId: string;
  voiceoverKind?: string;
  genres: string[];
  completedAt: number;
  watchedSeconds: number;
  nightWatch?: boolean;
  subtitles?: boolean;
  withFriend?: boolean;
  episodeDurationSec?: number;
}

/**
 * Pure reducer that folds a completion event into the cumulative statistics.
 * Statistics are always derived from stored watch data — nothing is invented.
 */
export function applyCompletion(
  stats: CumulativeWatchStats,
  dailyCompletions: Record<string, number>,
  event: CompletionEvent,
  titleCompletedNow: boolean,
): { stats: CumulativeWatchStats; dailyCompletions: Record<string, number> } {
  const day = dayKey(event.completedAt);
  const nextDaily = { ...dailyCompletions, [day]: (dailyCompletions[day] ?? 0) + 1 };

  const night = event.nightWatch ?? isNightTime(event.completedAt);
  const genresWatched = { ...stats.genresWatched };
  for (const genre of event.genres) genresWatched[genre] = (genresWatched[genre] ?? 0) + 1;

  const providersUsed = { ...stats.providersUsed };
  providersUsed[event.providerId] = (providersUsed[event.providerId] ?? 0) + 1;

  const voiceoverKindsUsed = { ...stats.voiceoverKindsUsed };
  if (event.voiceoverKind) {
    voiceoverKindsUsed[event.voiceoverKind] = (voiceoverKindsUsed[event.voiceoverKind] ?? 0) + 1;
  }

  const nextStats: CumulativeWatchStats = {
    ...stats,
    episodesCompleted: stats.episodesCompleted + 1,
    secondsWatched: stats.secondsWatched + Math.max(0, event.watchedSeconds),
    titlesCompleted: stats.titlesCompleted + (titleCompletedNow ? 1 : 0),
    nightEpisodes: stats.nightEpisodes + (night ? 1 : 0),
    genresWatched,
    providersUsed,
    voiceoverKindsUsed,
    lastEpisodeAt: event.completedAt,
    completedDates: [...stats.completedDates, day].slice(-800),
    maximumEpisodesInADay: Math.max(stats.maximumEpisodesInADay, nextDaily[day] ?? 0),
    maximumEpisodesInAWeek: Math.max(stats.maximumEpisodesInAWeek, maxInTrailingWeek(nextDaily, day)),
    subtitleEpisodes: stats.subtitleEpisodes + (event.subtitles ? 1 : 0),
    friendBingeSessions: stats.friendBingeSessions + (event.withFriend ? 1 : 0),
  };

  return { stats: nextStats, dailyCompletions: nextDaily };
}

export function isNightTime(timestamp: number): boolean {
  const hours = new Date(timestamp).getHours();
  return hours >= 0 && hours < 6;
}

export function maxInTrailingWeek(daily: Record<string, number>, day: string): number {
  const anchor = startOfDay(new Date(`${day}T00:00:00`).getTime());
  let total = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    total += daily[dayKey(anchor - offset * 86_400_000)] ?? 0;
  }
  return total;
}

export function recomputeRollingWindows(
  stats: CumulativeWatchStats,
  dailyCompletions: Record<string, number>,
  now = Date.now(),
): CumulativeWatchStats {
  let weekly = 0;
  let monthly = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const count = dailyCompletions[dayKey(now - offset * 86_400_000)] ?? 0;
    if (offset < 7) weekly += count;
    monthly += count;
  }
  return { ...stats, weeklyEpisodes: weekly, monthlyEpisodes: monthly };
}

export function distinctCounts(stats: CumulativeWatchStats) {
  const genres = Object.keys(stats.genresWatched).filter((key) => (stats.genresWatched[key] ?? 0) > 0);
  const providers = Object.keys(stats.providersUsed).filter((key) => (stats.providersUsed[key] ?? 0) > 0);
  const voiceovers = Object.keys(stats.voiceoverKindsUsed).filter((key) => (stats.voiceoverKindsUsed[key] ?? 0) > 0);
  return {
    distinctGenres: genres.length,
    distinctProviders: providers.length,
    distinctVoiceoverKinds: voiceovers.length,
  };
}

export function statsWithDerived(
  stats: CumulativeWatchStats,
  entries: Record<string, WatchProgress>,
  daily: Record<string, number>,
  now = Date.now(),
): CumulativeWatchStats {
  const rolling = recomputeRollingWindows(stats, daily, now);
  const distinct = distinctCounts(rolling);
  const entryList = Object.values(entries);
  const titlesWithProgress = new Set(entryList.map((entry) => entry.titleId)).size;
  const titlesCompletedFromProgress = entryList.filter((entry) => entry.completed && entry.positionSec > 0).length;
  return {
    ...rolling,
    ...distinct,
    distinctTitlesWithProgress: titlesWithProgress,
    titlesStarted: Math.max(rolling.titlesStarted, titlesWithProgress),
    titlesCompleted: Math.max(rolling.titlesCompleted, Math.min(titlesCompletedFromProgress, titlesWithProgress)),
  };
}

export function statsBucketForHours(stats: CumulativeWatchStats): number {
  return Math.floor(stats.secondsWatched / 3600);
}

export { emptyCumulativeStats };
