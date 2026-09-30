export type AchievementCategory =
  | 'start'
  | 'episodes'
  | 'hours'
  | 'streak'
  | 'genre'
  | 'provider'
  | 'voiceover'
  | 'binge'
  | 'special';

export interface AchievementMetricContext {
  episodesCompleted: number;
  titlesCompleted: number;
  hoursWatched: number;
  secondsWatched: number;
  currentStreakDays: number;
  longestStreakDays: number;
  nightEpisodes: number;
  maximumEpisodesInADay: number;
  maximumEpisodesInAWeek: number;
  genreCount: (genre: string) => number;
  providerCount: (providerId: string) => number;
  voiceoverCount: (kind: string) => number;
  distinctGenres: number;
  distinctProviders: number;
  distinctVoiceoverKinds: number;
  favorites: number;
  bannerCount: number;
  libraryAssetCount: number;
  watchTogetherSessions: number;
  themesUsed: number;
  textsOverridden: number;
  subtitleEpisodes: number;
}

export interface AchievementDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  category: AchievementCategory;
  target: number;
  /** Returns current progress value for this achievement. */
  progress: (ctx: AchievementMetricContext) => number;
  hidden?: boolean;
}

export interface AchievementState {
  id: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: number;
  claimedReward?: boolean;
}
