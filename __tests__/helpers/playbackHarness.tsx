import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TextProvider } from '@/i18n/useText';
import { AppShell } from '@/navigation/AppShell';
import { settingsActions, useSettingsStore } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { progressActions } from '@/store/progressStore';
import type { RootStackParamList } from '@/navigation/types';
import { anilibriaEpisode, anilibriaRelease } from '../fixtures/releases';

export const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export const RELEASE_ID = String(anilibriaRelease.id);
export const RELEASE_WITH_EPISODES = { ...anilibriaRelease, episodes: [anilibriaEpisode] };
export const EPISODE = anilibriaEpisode;

interface Route {
  match: (url: string) => boolean;
  body: unknown;
  status?: number;
}

/**
 * Offline stand-in for the public AniLiberty endpoints. The payloads are the
 * recorded shapes from the provider fixtures, so the whole chain runs for real:
 * http client → provider → mapper → playback plan → player.
 */
export const ROUTES: Route[] = [
  { match: (url) => url.includes('/anime/releases/'), body: RELEASE_WITH_EPISODES },
  { match: (url) => url.includes('/anime/catalog/releases'), body: { data: [anilibriaRelease] } },
  { match: (url) => url.includes('/app/search/releases'), body: { data: [anilibriaRelease] } },
  { match: (url) => url.includes('/anime/genres'), body: [] },
  { match: (url) => url.includes('/app/status'), body: { is_alive: true, version: 'v1' } },
];

export const requestedHosts = new Set<string>();

export function installFetchStub(): void {
  const stub = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requestedHosts.add(new URL(url).host);
    const route = ROUTES.find((candidate) => candidate.match(url));
    if (!route) {
      throw new TypeError(`offline test: no route for ${url}`);
    }
    void init;
    return {
      ok: route.status === undefined || route.status < 400,
      status: route.status ?? 200,
      url,
      text: async () => JSON.stringify(route.body),
      json: async () => route.body,
      headers: new Map(),
    } as unknown as Response;
  };
  global.fetch = stub as unknown as typeof fetch;
}

/** Puts the persisted playback-related stores back to their defaults. */
export function resetPlaybackState(): void {
  progressActions.resetAll();
  settingsActions.set('autoPlayNext', false);
  settingsActions.set('skipIntro', false);
  settingsActions.set('playbackSpeed', 1);
}

/** Same provider stack the shipped app uses, so navigation, theme and text are real. */
export function wrap(children: React.ReactNode): React.ReactElement {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider presetId="minimalist" mode="dark">
        <TextProvider language={useSettingsStore.getState().language} overrides={useTextStore.getState().overrides}>
          <NavigationContainer>
            <AppShell>{children}</AppShell>
          </NavigationContainer>
        </TextProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** The route params the player receives when it is opened from the details dialog. */
export function playerTitle(): RootStackParamList['Player']['title'] {
  return {
    id: `anilibria:${RELEASE_ID}`,
    providerId: 'anilibria',
    refId: RELEASE_ID,
    title: 'Тестовый релиз',
    genres: ['Фэнтези'],
    capabilities: {
      search: true,
      metadata: true,
      episodes: true,
      streams: true,
      voiceovers: true,
      qualities: true,
      schedule: true,
      publicApi: true,
    },
    providerRefs: [{ providerId: 'anilibria', refId: RELEASE_ID }],
  } as unknown as RootStackParamList['Player']['title'];
}
