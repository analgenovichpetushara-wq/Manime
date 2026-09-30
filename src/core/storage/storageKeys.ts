/** Every persisted namespace/identifier of the application in one place. */
export const StorageKeys = {
  settings: 'settings',
  theme: 'theme',
  text: 'text',
  profile: 'profile',
  progress: 'progress',
  favorites: 'favorites',
  watchlists: 'watchlists',
  achievements: 'achievements',
  banners: 'banners',
  library: 'library',
  providerHealth: 'provider-health',
  watchTogether: 'watch-together',
  stats: 'stats',
} as const;

export type StorageKeyName = (typeof StorageKeys)[keyof typeof StorageKeys];
