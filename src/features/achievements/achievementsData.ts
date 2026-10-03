import type { AchievementDefinition } from '@/data/models/achievements';

/**
 * 66 achievements. Every definition is data-only: progress is computed from the
 * real watch history through AchievementMetricContext.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Getting started
  { id: 'first-launch', titleKey: 'ach.firstLaunch.title', descriptionKey: 'ach.firstLaunch.description', icon: 'sparkles', category: 'start', target: 1, progress: () => 1 },
  { id: 'first-title', titleKey: 'ach.firstTitle.title', descriptionKey: 'ach.firstTitle.description', icon: 'play-circle', category: 'start', target: 1, progress: (c) => Math.min(1, c.titlesCompleted) },
  { id: 'first-episode', titleKey: 'ach.firstEpisode.title', descriptionKey: 'ach.firstEpisode.description', icon: 'film', category: 'start', target: 1, progress: (c) => Math.min(1, c.episodesCompleted) },
  { id: 'first-favorite', titleKey: 'ach.firstFavorite.title', descriptionKey: 'ach.firstFavorite.description', icon: 'heart', category: 'start', target: 1, progress: (c) => Math.min(1, c.favorites) },
  { id: 'five-titles', titleKey: 'ach.fiveTitles.title', descriptionKey: 'ach.fiveTitles.description', icon: 'layers', category: 'start', target: 5, progress: (c) => c.titlesCompleted },
  { id: 'first-completed', titleKey: 'ach.firstCompleted.title', descriptionKey: 'ach.firstCompleted.description', icon: 'check-circle', category: 'start', target: 1, progress: (c) => Math.min(1, c.titlesCompleted) },

  // Episodes
  { id: 'episodes-10', titleKey: 'ach.episodes10.title', descriptionKey: 'ach.episodes10.description', icon: 'list', category: 'episodes', target: 10, progress: (c) => c.episodesCompleted },
  { id: 'episodes-25', titleKey: 'ach.episodes25.title', descriptionKey: 'ach.episodes25.description', icon: 'list', category: 'episodes', target: 25, progress: (c) => c.episodesCompleted },
  { id: 'episodes-50', titleKey: 'ach.episodes50.title', descriptionKey: 'ach.episodes50.description', icon: 'list', category: 'episodes', target: 50, progress: (c) => c.episodesCompleted },
  { id: 'episodes-100', titleKey: 'ach.episodes100.title', descriptionKey: 'ach.episodes100.description', icon: 'award', category: 'episodes', target: 100, progress: (c) => c.episodesCompleted },
  { id: 'episodes-250', titleKey: 'ach.episodes250.title', descriptionKey: 'ach.episodes250.description', icon: 'award', category: 'episodes', target: 250, progress: (c) => c.episodesCompleted },
  { id: 'episodes-500', titleKey: 'ach.episodes500.title', descriptionKey: 'ach.episodes500.description', icon: 'award', category: 'episodes', target: 500, progress: (c) => c.episodesCompleted },
  { id: 'episodes-1000', titleKey: 'ach.episodes1000.title', descriptionKey: 'ach.episodes1000.description', icon: 'trophy', category: 'episodes', target: 1000, progress: (c) => c.episodesCompleted },
  { id: 'episodes-2000', titleKey: 'ach.episodes2000.title', descriptionKey: 'ach.episodes2000.description', icon: 'trophy', category: 'episodes', target: 2000, progress: (c) => c.episodesCompleted },
  { id: 'titles-10-complete', titleKey: 'ach.titles10.title', descriptionKey: 'ach.titles10.description', icon: 'check-circle', category: 'episodes', target: 10, progress: (c) => c.titlesCompleted },
  { id: 'titles-25-complete', titleKey: 'ach.titles25.title', descriptionKey: 'ach.titles25.description', icon: 'check-circle', category: 'episodes', target: 25, progress: (c) => c.titlesCompleted },
  { id: 'titles-50-complete', titleKey: 'ach.titles50.title', descriptionKey: 'ach.titles50.description', icon: 'trophy', category: 'episodes', target: 50, progress: (c) => c.titlesCompleted },
  { id: 'titles-100-complete', titleKey: 'ach.titles100.title', descriptionKey: 'ach.titles100.description', icon: 'trophy', category: 'episodes', target: 100, progress: (c) => c.titlesCompleted },

  // Hours
  { id: 'hours-10', titleKey: 'ach.hours10.title', descriptionKey: 'ach.hours10.description', icon: 'clock', category: 'hours', target: 10, progress: (c) => c.hoursWatched },
  { id: 'hours-24', titleKey: 'ach.hours24.title', descriptionKey: 'ach.hours24.description', icon: 'clock', category: 'hours', target: 24, progress: (c) => c.hoursWatched },
  { id: 'hours-50', titleKey: 'ach.hours50.title', descriptionKey: 'ach.hours50.description', icon: 'clock', category: 'hours', target: 50, progress: (c) => c.hoursWatched },
  { id: 'hours-100', titleKey: 'ach.hours100.title', descriptionKey: 'ach.hours100.description', icon: 'clock', category: 'hours', target: 100, progress: (c) => c.hoursWatched },
  { id: 'hours-250', titleKey: 'ach.hours250.title', descriptionKey: 'ach.hours250.description', icon: 'zap', category: 'hours', target: 250, progress: (c) => c.hoursWatched },
  { id: 'hours-500', titleKey: 'ach.hours500.title', descriptionKey: 'ach.hours500.description', icon: 'zap', category: 'hours', target: 500, progress: (c) => c.hoursWatched },
  { id: 'hours-1000', titleKey: 'ach.hours1000.title', descriptionKey: 'ach.hours1000.description', icon: 'star', category: 'hours', target: 1000, progress: (c) => c.hoursWatched },

  // Streaks
  { id: 'streak-3', titleKey: 'ach.streak3.title', descriptionKey: 'ach.streak3.description', icon: 'flame', category: 'streak', target: 3, progress: (c) => c.longestStreakDays },
  { id: 'streak-7', titleKey: 'ach.streak7.title', descriptionKey: 'ach.streak7.description', icon: 'flame', category: 'streak', target: 7, progress: (c) => c.longestStreakDays },
  { id: 'streak-14', titleKey: 'ach.streak14.title', descriptionKey: 'ach.streak14.description', icon: 'flame', category: 'streak', target: 14, progress: (c) => c.longestStreakDays },
  { id: 'streak-30', titleKey: 'ach.streak30.title', descriptionKey: 'ach.streak30.description', icon: 'flame', category: 'streak', target: 30, progress: (c) => c.longestStreakDays },
  { id: 'streak-60', titleKey: 'ach.streak60.title', descriptionKey: 'ach.streak60.description', icon: 'flame', category: 'streak', target: 60, progress: (c) => c.longestStreakDays },
  { id: 'streak-100', titleKey: 'ach.streak100.title', descriptionKey: 'ach.streak100.description', icon: 'trophy', category: 'streak', target: 100, progress: (c) => c.longestStreakDays },
  { id: 'streak-365', titleKey: 'ach.streak365.title', descriptionKey: 'ach.streak365.description', icon: 'trophy', category: 'streak', target: 365, progress: (c) => c.longestStreakDays },

  // Genres
  { id: 'genre-action', titleKey: 'ach.genreAction.title', descriptionKey: 'ach.genreAction.description', icon: 'zap', category: 'genre', target: 25, progress: (c) => c.genreCount('Экшен') + c.genreCount('Боевые искусства') },
  { id: 'genre-comedy', titleKey: 'ach.genreComedy.title', descriptionKey: 'ach.genreComedy.description', icon: 'smile', category: 'genre', target: 25, progress: (c) => c.genreCount('Комедия') },
  { id: 'genre-drama', titleKey: 'ach.genreDrama.title', descriptionKey: 'ach.genreDrama.description', icon: 'theater', category: 'genre', target: 25, progress: (c) => c.genreCount('Драма') },
  { id: 'genre-romance', titleKey: 'ach.genreRomance.title', descriptionKey: 'ach.genreRomance.description', icon: 'heart', category: 'genre', target: 25, progress: (c) => c.genreCount('Романтика') },
  { id: 'genre-fantasy', titleKey: 'ach.genreFantasy.title', descriptionKey: 'ach.genreFantasy.description', icon: 'wand', category: 'genre', target: 25, progress: (c) => c.genreCount('Фэнтези') + c.genreCount('Магия') },
  { id: 'genre-mystery', titleKey: 'ach.genreMystery.title', descriptionKey: 'ach.genreMystery.description', icon: 'search', category: 'genre', target: 15, progress: (c) => c.genreCount('Детектив') + c.genreCount('Мистика') },
  { id: 'genre-horror', titleKey: 'ach.genreHorror.title', descriptionKey: 'ach.genreHorror.description', icon: 'moon', category: 'genre', target: 10, progress: (c) => c.genreCount('Ужасы') + c.genreCount('Демоны') + c.genreCount('Вампиры') },
  { id: 'genre-scifi', titleKey: 'ach.genreScifi.title', descriptionKey: 'ach.genreScifi.description', icon: 'cpu', category: 'genre', target: 15, progress: (c) => c.genreCount('Фантастика') + c.genreCount('Меха') + c.genreCount('Киберпанк') + c.genreCount('Космос') },
  { id: 'genre-explorer', titleKey: 'ach.genreExplorer.title', descriptionKey: 'ach.genreExplorer.description', icon: 'compass', category: 'genre', target: 10, progress: (c) => c.distinctGenres },
  { id: 'genre-connoisseur', titleKey: 'ach.genreConnoisseur.title', descriptionKey: 'ach.genreConnoisseur.description', icon: 'compass', category: 'genre', target: 20, progress: (c) => c.distinctGenres },

  // Providers
  { id: 'provider-first', titleKey: 'ach.providerFirst.title', descriptionKey: 'ach.providerFirst.description', icon: 'server', category: 'provider', target: 1, progress: (c) => c.distinctProviders },
  { id: 'provider-all', titleKey: 'ach.providerAll.title', descriptionKey: 'ach.providerAll.description', icon: 'server', category: 'provider', target: 3, progress: (c) => c.distinctProviders },
  { id: 'provider-loyal', titleKey: 'ach.providerLoyal.title', descriptionKey: 'ach.providerLoyal.description', icon: 'server', category: 'provider', target: 100, progress: (c) => Math.max(c.providerCount('kodik'), c.providerCount('anime365')) },
  { id: 'provider-fallback', titleKey: 'ach.providerFallback.title', descriptionKey: 'ach.providerFallback.description', icon: 'shuffle', category: 'provider', target: 25, progress: (c) => c.providerCount('anime365') },

  // Voiceovers
  { id: 'voice-first', titleKey: 'ach.voiceFirst.title', descriptionKey: 'ach.voiceFirst.description', icon: 'mic', category: 'voiceover', target: 1, progress: (c) => c.voiceoverCount('voice') + c.voiceoverCount('dub') },
  { id: 'voice-russian-100', titleKey: 'ach.voiceRussian100.title', descriptionKey: 'ach.voiceRussian100.description', icon: 'mic', category: 'voiceover', target: 100, progress: (c) => c.voiceoverCount('voice') + c.voiceoverCount('dub') },
  { id: 'voice-raw-25', titleKey: 'ach.voiceRaw25.title', descriptionKey: 'ach.voiceRaw25.description', icon: 'volume', category: 'voiceover', target: 25, progress: (c) => c.voiceoverCount('raw') },
  { id: 'voice-subtitles-50', titleKey: 'ach.voiceSubs50.title', descriptionKey: 'ach.voiceSubs50.description', icon: 'type', category: 'voiceover', target: 50, progress: (c) => c.subtitleEpisodes },
  { id: 'voice-variety', titleKey: 'ach.voiceVariety.title', descriptionKey: 'ach.voiceVariety.description', icon: 'shuffle', category: 'voiceover', target: 3, progress: (c) => c.distinctVoiceoverKinds },

  // Binge / habits
  { id: 'binge-5-day', titleKey: 'ach.binge5.title', descriptionKey: 'ach.binge5.description', icon: 'fast-forward', category: 'binge', target: 5, progress: (c) => c.maximumEpisodesInADay },
  { id: 'binge-10-day', titleKey: 'ach.binge10.title', descriptionKey: 'ach.binge10.description', icon: 'fast-forward', category: 'binge', target: 10, progress: (c) => c.maximumEpisodesInADay },
  { id: 'binge-25-week', titleKey: 'ach.binge25.title', descriptionKey: 'ach.binge25.description', icon: 'fast-forward', category: 'binge', target: 25, progress: (c) => c.maximumEpisodesInAWeek },
  { id: 'night-owl', titleKey: 'ach.nightOwl.title', descriptionKey: 'ach.nightOwl.description', icon: 'moon', category: 'binge', target: 25, progress: (c) => c.nightEpisodes },
  { id: 'midnight-marathon', titleKey: 'ach.midnightMarathon.title', descriptionKey: 'ach.midnightMarathon.description', icon: 'moon', category: 'binge', target: 100, progress: (c) => c.nightEpisodes },

  // Special: app usage / customization
  { id: 'designer', titleKey: 'ach.designer.title', descriptionKey: 'ach.designer.description', icon: 'palette', category: 'special', target: 3, progress: (c) => c.themesUsed },
  { id: 'theme-collector', titleKey: 'ach.themeCollector.title', descriptionKey: 'ach.themeCollector.description', icon: 'palette', category: 'special', target: 7, progress: (c) => c.themesUsed },
  { id: 'banner-artist', titleKey: 'ach.bannerArtist.title', descriptionKey: 'ach.bannerArtist.description', icon: 'image', category: 'special', target: 1, progress: (c) => c.bannerCount },
  { id: 'banner-collector', titleKey: 'ach.bannerCollector.title', descriptionKey: 'ach.bannerCollector.description', icon: 'image', category: 'special', target: 5, progress: (c) => c.bannerCount },
  { id: 'librarian', titleKey: 'ach.librarian.title', descriptionKey: 'ach.librarian.description', icon: 'folder', category: 'special', target: 10, progress: (c) => c.libraryAssetCount },
  { id: 'wordsmith', titleKey: 'ach.wordsmith.title', descriptionKey: 'ach.wordsmith.description', icon: 'edit-3', category: 'special', target: 10, progress: (c) => c.textsOverridden },
  { id: 'watch-buddy', titleKey: 'ach.watchBuddy.title', descriptionKey: 'ach.watchBuddy.description', icon: 'users', category: 'special', target: 1, progress: (c) => c.watchTogetherSessions },
  { id: 'watch-party', titleKey: 'ach.watchParty.title', descriptionKey: 'ach.watchParty.description', icon: 'users', category: 'special', target: 10, progress: (c) => c.watchTogetherSessions },
  { id: 'favorites-10', titleKey: 'ach.favorites10.title', descriptionKey: 'ach.favorites10.description', icon: 'heart', category: 'special', target: 10, progress: (c) => c.favorites },
  { id: 'favorites-50', titleKey: 'ach.favorites50.title', descriptionKey: 'ach.favorites50.description', icon: 'heart', category: 'special', target: 50, progress: (c) => c.favorites },
];

export const ACHIEVEMENTS_BY_CATEGORY = ACHIEVEMENTS.reduce<Record<string, AchievementDefinition[]>>((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {});

export function achievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((item) => item.id === id);
}

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
