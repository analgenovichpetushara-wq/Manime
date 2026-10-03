import type { ThemeMode } from '@/theme/themeTypes';

export type AppLanguage = 'ru' | 'en';

export interface AppSettings {
  themePresetId: string;
  mode: ThemeMode;
  amoled: boolean;
  accentColor?: string;
  language: AppLanguage;
  playbackSpeed: number;
  autoPlayNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  defaultQuality: 'auto' | '480' | '720' | '1080';
  preferredQualityHeight?: number;
  subtitleEnabled: boolean;
  subtitleFontScale: number;
  subtitleBackgroundOpacity: number;
  subtitleTextColor?: string;
  subtitleFontWeight: 'normal' | 'bold';
  fontScale: number;
  reduceMotion: boolean;
  notificationsEnabled: boolean;
  wifiOnlyStreaming: boolean;
  downloadsEnabled: boolean;
  downloadQuality: '480' | '720' | '1080';
  cacheTtlHours: number;
  providerPreferences: string[];
  disabledProviderIds: string[];
  matureTitlesVisible: boolean;
  watchTogetherDisplayName?: string;
  defaultVoiceoverProviderPreference: string[];
}

export function createDefaultSettings(): AppSettings {
  return {
    themePresetId: 'minimalist',
    mode: 'dark',
    amoled: false,
    accentColor: undefined,
    language: 'ru',
    playbackSpeed: 1,
    autoPlayNext: true,
    skipIntro: false,
    skipOutro: false,
    defaultQuality: 'auto',
    subtitleEnabled: true,
    subtitleFontScale: 1,
    subtitleBackgroundOpacity: 0.6,
    subtitleFontWeight: 'normal',
    fontScale: 1,
    reduceMotion: false,
    notificationsEnabled: true,
    wifiOnlyStreaming: false,
    downloadsEnabled: false,
    downloadQuality: '720',
    cacheTtlHours: 6,
    providerPreferences: ['kodik', 'anime365', 'shikimori'],
    disabledProviderIds: [],
    matureTitlesVisible: true,
    defaultVoiceoverProviderPreference: ['kodik', 'anime365'],
  };
}
