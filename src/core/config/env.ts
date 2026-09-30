import Constants from 'expo-constants';

/**
 * Environment configuration.
 * Only non-secret, public values live here. Nothing is hardcoded that should be
 * configurable per environment (see .env.example).
 */
export interface AppEnv {
  watchTogetherUrl: string;
  anilibriaBaseUrl: string;
  anilibriaMirrorBaseUrl: string;
  anime365BaseUrl: string;
  shikimoriBaseUrl: string;
  environment: string;
  isTest: boolean;
}

type ExtraShape = {
  watchTogetherUrl?: string;
  anilibriaBaseUrl?: string;
  anime365BaseUrl?: string;
  shikimoriBaseUrl?: string;
  environment?: string;
};

function readExtra(): ExtraShape {
  const extra = (Constants?.expoConfig?.extra ?? {}) as ExtraShape;
  return extra;
}

const extra = readExtra();

export const env: AppEnv = {
  watchTogetherUrl: process.env.EXPO_PUBLIC_WATCH_TOGETHER_URL ?? extra.watchTogetherUrl ?? '',
  anilibriaBaseUrl:
    process.env.EXPO_PUBLIC_ANILIBRIA_BASE_URL ?? extra.anilibriaBaseUrl ?? 'https://api.anilibria.app/api/v1',
  anilibriaMirrorBaseUrl: 'https://aniliberty.top/api/v1',
  anime365BaseUrl: process.env.EXPO_PUBLIC_ANIME365_BASE_URL ?? extra.anime365BaseUrl ?? 'https://smotret-anime.online/api',
  shikimoriBaseUrl: process.env.EXPO_PUBLIC_SHIKIMORI_BASE_URL ?? extra.shikimoriBaseUrl ?? 'https://shikimori.io/api',
  environment: process.env.EXPO_PUBLIC_ENV ?? extra.environment ?? 'production',
  isTest: (process.env.EXPO_PUBLIC_ENV ?? extra.environment) === 'test',
};

export const APP_USER_AGENT = 'AnimAlc/1.0 (mobile; +https://github.com/analgenovichpetushara-wq/Anime-s)';
