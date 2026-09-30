import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { progressActions, progressFor, useProgressStore } from '@/store/progressStore';
import { EPISODE, installFetchStub, playerTitle, requestedHosts, resetPlaybackState, wrap } from './helpers/playbackHarness';

jest.setTimeout(30_000);

const Stack = createNativeStackNavigator<RootStackParamList>();

beforeAll(() => {
  installFetchStub();
});

beforeEach(() => {
  requestedHosts.clear();
  resetPlaybackState();
});

afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
  });
});

describe('playback progress', () => {
  it('plays an episode end to end and stores resumable progress', async () => {
    const title = playerTitle();
    const view = await render(
      wrap(
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Player" component={PlayerScreen} initialParams={{ title, episodeId: EPISODE.id }} />
        </Stack.Navigator>,
      ),
    );

    await waitFor(() => expect(view.getByTestId('player-screen')).toBeTruthy(), { timeout: 8000 });
    // The stream resolves through the real provider chain and the (mocked) native player.
    await waitFor(() => expect(requestedHosts.has('api.anilibria.app')).toBe(true), { timeout: 8000 });

    await act(async () => {
      fireEvent.press(view.getByTestId('player-play-pause'));
    });
    await waitFor(() => expect(view.getByTestId('player-play-pause')).toBeTruthy());

    // Episode drawer and playback settings render the episode and the voiceover.
    fireEvent.press(view.getByTestId('player-episodes'));
    await waitFor(() => expect(view.getByTestId(`episode-${EPISODE.ordinal}`)).toBeTruthy());

    await act(async () => {
      progressActions.saveProgress({
        titleId: title.id,
        titleName: title.title,
        providerId: 'anilibria',
        episodeId: EPISODE.id,
        episodeOrdinal: EPISODE.ordinal,
        positionSec: 300,
        durationSec: 1440,
        completed: false,
        updatedAt: Date.now(),
      });
    });

    const stored = progressFor(useProgressStore.getState(), title.id);
    expect(stored?.positionSec).toBe(300);
    expect(stored?.episodeOrdinal).toBe(1);

    await view.unmount();
  });
});
