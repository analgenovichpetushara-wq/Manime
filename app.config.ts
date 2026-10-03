import type { ExpoConfig } from 'expo/config';

/**
 * AnimAlc Expo configuration.
 * Secrets are never committed: everything is resolved from the environment at
 * build time (see .env.example). Public values use the EXPO_PUBLIC_ prefix.
 */
const config: ExpoConfig = {
  name: 'AnimAlc',
  slug: 'animalc',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'animalc',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.animalc.mobile',
    buildNumber: process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ?? '1',
    // Signing an iOS build needs an Apple Developer team; the id is provided at
    // build time and is not a secret (see docs/RELEASE.md).
    appleTeamId: process.env.EXPO_PUBLIC_APPLE_TEAM_ID ?? undefined,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'AnimAlc needs access to your gallery so you can use your own images as avatars, banners and backgrounds.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsArbitraryLoadsInWebContent: true,
      },
      UIBackgroundModes: ['audio'],
    },
  },
  android: {
    package: 'app.animalc.mobile',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#08080c',
    },
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'VIBRATE'],
  },
  plugins: [
    // Release signing for the generated Android project (keystore comes from
    // the environment or android/keystore.properties — never from the repo).
    './plugins/withAndroidSigning',
    'expo-video',
    [
      'expo-image-picker',
      {
        photosPermission: 'AnimAlc uses your photos for avatars, banners and backgrounds.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#08080c',
        image: './assets/images/splash.png',
        imageWidth: 200,
      },
    ],
  ],
  extra: {
    watchTogetherUrl: process.env.EXPO_PUBLIC_WATCH_TOGETHER_URL ?? '',
    kodikBaseUrl: process.env.EXPO_PUBLIC_KODIK_BASE_URL ?? 'https://kodik-api.com',
    kodikGatewayUrl: process.env.EXPO_PUBLIC_KODIK_GATEWAY_URL ?? '',
    anime365BaseUrl: process.env.EXPO_PUBLIC_ANIME365_BASE_URL ?? 'https://smotret-anime.online/api',
    shikimoriBaseUrl: process.env.EXPO_PUBLIC_SHIKIMORI_BASE_URL ?? 'https://shikimori.io/api',
    environment: process.env.EXPO_PUBLIC_ENV ?? 'production',
  },
};

export default config;
