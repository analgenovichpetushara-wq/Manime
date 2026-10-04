import Constants from 'expo-constants';

/**
 * Environment configuration.
 *
 * Only non-secret, public values live here. The Kodik API is credential based:
 * a partner token is required, so the supported production layout is the
 * gateway (see server/kodik-gateway.mjs) which keeps the token server-side.
 * `EXPO_PUBLIC_KODIK_TOKEN` exists for local development only and must never be
 * baked into a shipped build — see docs/PROVIDERS.md.
 */
export interface AppEnv {
  watchTogetherUrl: string;
  /** Base URL of the AniLiberty REST API (`/api/v1`). Public, no credentials. */
  anilibriaBaseUrl: string;
  /** Fallback mirror used when the primary host does not answer. */
  anilibriaMirrorBaseUrl: string;
  /** Base URL of the Kodik REST API (or of the AnimAlc gateway exposing it). */
  kodikBaseUrl: string;
  /**
   * Optional AnimAlc gateway that proxies Kodik with a server-side token.
   * When set, the mobile app never holds Kodik credentials.
   */
  kodikGatewayUrl: string;
  /** Development-only Kodik partner token. Empty in production builds. */
  kodikToken: string;
  anime365BaseUrl: string;
  shikimoriBaseUrl: string;
  environment: string;
  isTest: boolean;
}

type ExtraShape = {
  watchTogetherUrl?: string;
  anilibriaBaseUrl?: string;
  kodikBaseUrl?: string;
  kodikGatewayUrl?: string;
  anime365BaseUrl?: string;
  shikimoriBaseUrl?: string;
  environment?: string;
};

function readExtra(): ExtraShape {
  const extra = (Constants?.expoConfig?.extra ?? {}) as ExtraShape;
  return extra;
}

const extra = readExtra();

/** Live endpoint probed during the migration audit (see docs/PROVIDERS.md). */
export const KODIK_DEFAULT_BASE_URL = 'https://kodik-api.com';

export const env: AppEnv = {
  watchTogetherUrl: process.env.EXPO_PUBLIC_WATCH_TOGETHER_URL ?? extra.watchTogetherUrl ?? '',
  anilibriaBaseUrl:
    process.env.EXPO_PUBLIC_ANILIBRIA_BASE_URL ?? extra.anilibriaBaseUrl ?? 'https://api.anilibria.app/api/v1',
  anilibriaMirrorBaseUrl: 'https://aniliberty.top/api/v1',
  kodikBaseUrl:
    process.env.EXPO_PUBLIC_KODIK_GATEWAY_URL ??
    extra.kodikGatewayUrl ??
    process.env.EXPO_PUBLIC_KODIK_BASE_URL ??
    extra.kodikBaseUrl ??
    KODIK_DEFAULT_BASE_URL,
  kodikGatewayUrl: process.env.EXPO_PUBLIC_KODIK_GATEWAY_URL ?? extra.kodikGatewayUrl ?? '',
  kodikToken: process.env.EXPO_PUBLIC_KODIK_TOKEN ?? '',
  anime365BaseUrl: process.env.EXPO_PUBLIC_ANIME365_BASE_URL ?? extra.anime365BaseUrl ?? 'https://smotret-anime.online/api',
  shikimoriBaseUrl: process.env.EXPO_PUBLIC_SHIKIMORI_BASE_URL ?? extra.shikimoriBaseUrl ?? 'https://shikimori.io/api',
  environment: process.env.EXPO_PUBLIC_ENV ?? extra.environment ?? 'production',
  isTest: (process.env.EXPO_PUBLIC_ENV ?? extra.environment) === 'test',
};

export const APP_USER_AGENT = 'AnimAlc/1.0 (mobile; +https://github.com/analgenovichpetushara-wq/Anime-s)';
