import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TextProvider } from '@/i18n/useText';
import { AppShell } from '@/navigation/AppShell';
import { settingsActions, useSettingsStore } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { progressActions } from '@/store/progressStore';
import { KodikProvider } from '@/providers/implementations/kodik/provider';
import { mapEpisodes, mapRelease } from '@/providers/implementations/kodik/mapper';
import { a365Episode, a365Series, a365Translation, shikimoriAnime } from '../fixtures/releases';
import { kodikMaterialWithEpisodes, kodikRelease, kodikReleaseVoiceover, kodikSearchResponse } from '../fixtures/kodik';
import type { RootStackParamList } from '@/navigation/types';

export const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const KODIK_CAPABILITIES = new KodikProvider().descriptor.capabilities;

/** The Kodik material the whole suite plays: captured payload → shipped mapper. */
export const MATERIAL = kodikMaterialWithEpisodes;
export const RELEASE_ID = kodikRelease.id;
export const TITLE_ID = `kodik:${RELEASE_ID}`;
export const TITLE = mapRelease(kodikMaterialWithEpisodes, KODIK_CAPABILITIES);
export const EPISODE = mapEpisodes(kodikMaterialWithEpisodes)[0]!;

interface Route {
  match: (url: string) => boolean;
  body: unknown;
  status?: number;
}

/**
 * Offline stand-in for the provider endpoints AnimAlc ships.
 *
 * Every payload is a recording of a real provider response, so the whole chain
 * runs for real: http client → provider → mapper → playback plan → player.
 */
export const ROUTES: Route[] = [
  // Kodik: /search by id returns every translation of the material,
  // with_episodes adds seasons → episodes (embed player links).
  {
    match: (url) => url.includes('kodik-api.com/search') && url.includes('with_episodes=true'),
    body: kodikSearchResponse([kodikMaterialWithEpisodes], 1),
  },
  {
    match: (url) => url.includes('kodik-api.com/search') && url.includes('id=serial-'),
    body: kodikSearchResponse([kodikReleaseVoiceover, kodikRelease], 2),
  },
  { match: (url) => url.includes('kodik-api.com/search'), body: kodikSearchResponse([kodikRelease], 1) },
  { match: (url) => url.includes('kodik-api.com/list'), body: kodikSearchResponse([kodikRelease], 1) },
  { match: (url) => url.includes('smotret-anime.online/api/series/'), body: { data: [a365Series] } },
  { match: (url) => url.includes('smotret-anime.online/api/episodes'), body: { data: [a365Episode] } },
  { match: (url) => url.includes('smotret-anime.online/api/translations'), body: { data: [a365Translation] } },
  { match: (url) => url.includes('shikimori.io/api/animes'), body: [shikimoriAnime] },
];

export const requestedHosts = new Set<string>();

export function installFetchStub(routes: Route[] = ROUTES): void {
  const stub = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requestedHosts.add(new URL(url).host);
    const route = routes.find((candidate) => candidate.match(url));
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
    id: TITLE_ID,
    providerId: 'kodik',
    refId: RELEASE_ID,
    title: TITLE.title,
    genres: TITLE.genres,
    capabilities: KODIK_CAPABILITIES,
    providerRefs: TITLE.providerRefs,
  } as unknown as RootStackParamList['Player']['title'];
}
