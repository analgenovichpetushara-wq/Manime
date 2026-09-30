export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUri?: string;
  avatarIsGif: boolean;
  bannerUri?: string;
  bannerIsGif: boolean;
  accentColor?: string;
  pronouns?: string;
  status?: string;
  createdAt: number;
  updatedAt: number;
  favoriteGenres: string[];
  favoriteTitleIds: string[];
}

export function createDefaultProfile(): UserProfile {
  const now = Date.now();
  return {
    username: 'animalc_user',
    displayName: 'Anime Fan',
    bio: '',
    avatarIsGif: false,
    bannerIsGif: false,
    createdAt: now,
    updatedAt: now,
    favoriteGenres: [],
    favoriteTitleIds: [],
  };
}

export interface ProfileStats {
  titlesWatched: number;
  titlesCompleted: number;
  episodesCompleted: number;
  hoursWatched: number;
  currentStreakDays: number;
  longestStreakDays: number;
  favorites: number;
  providerUsage: { providerId: string; episodes: number }[];
  averageEpisodeMinutes: number;
  nightWatchShare: number;
}
