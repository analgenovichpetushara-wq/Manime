export type WatchlistCategory = 'watching' | 'planned' | 'completed' | 'dropped' | 'favorites';

export const WATCHLIST_CATEGORIES: WatchlistCategory[] = ['watching', 'planned', 'completed', 'dropped', 'favorites'];

export interface WatchProgress {
  titleId: string;
  titleName: string;
  poster?: string;
  providerId: string;
  episodeId: string;
  episodeOrdinal: number;
  episodeName?: string;
  positionSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt: number;
  voiceoverId?: string;
  qualityId?: string;
}

export interface CumulativeWatchStats {
  episodesCompleted: number;
  titlesCompleted: number;
  titlesStarted: number;
  secondsWatched: number;
  nightEpisodes: number;
  weeklyEpisodes: number;
  monthlyEpisodes: number;
  genresWatched: Record<string, number>;
  providersUsed: Record<string, number>;
  voiceoverKindsUsed: Record<string, number>;
  lastEpisodeAt?: number;
  completedDates: string[];
  maximumEpisodesInADay: number;
  maximumEpisodesInAWeek: number;
  distinctTitlesWithProgress: number;
  distinctGenres: number;
  distinctProviders: number;
  distinctVoiceoverKinds: number;
  friendBingeSessions: number;
  subtitleEpisodes: number;
}

export function emptyCumulativeStats(): CumulativeWatchStats {
  return {
    episodesCompleted: 0,
    titlesCompleted: 0,
    titlesStarted: 0,
    secondsWatched: 0,
    nightEpisodes: 0,
    weeklyEpisodes: 0,
    monthlyEpisodes: 0,
    genresWatched: {},
    providersUsed: {},
    voiceoverKindsUsed: {},
    lastEpisodeAt: undefined,
    completedDates: [],
    maximumEpisodesInADay: 0,
    maximumEpisodesInAWeek: 0,
    distinctTitlesWithProgress: 0,
    distinctGenres: 0,
    distinctProviders: 0,
    distinctVoiceoverKinds: 0,
    friendBingeSessions: 0,
    subtitleEpisodes: 0,
  };
}
