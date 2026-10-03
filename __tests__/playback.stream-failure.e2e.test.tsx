import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { EmbedPlayerScreen } from '@/features/player/EmbedPlayerScreen';
import { installFetchStub, playerTitle, requestedHosts, resetPlaybackState, wrap } from './helpers/playbackHarness';

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

describe('provider stream failures', () => {
  it('keeps the player usable when the provider returns no stream for an episode', async () => {
    const view = await render(
      wrap(
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            initialParams={{ title: playerTitle(), episodeId: 'missing-episode', providerId: 'kodik' }}
          />
          <Stack.Screen name="EmbedPlayer" component={EmbedPlayerScreen} />
        </Stack.Navigator>,
      ),
    );

    // No crash: the screen renders and stays operable while the stream is unresolved.
    await waitFor(() => expect(view.getByTestId('player-screen')).toBeTruthy(), { timeout: 8000 });
    expect(view.getByTestId('player-back')).toBeTruthy();

    // Kodik has no media URL, so the source's own player is offered instead —
    // and it opens inside the app with the official embed link.
    const sourceButton = await waitFor(() => view.getByTestId('player-open-source'), { timeout: 8000 });
    await act(async () => {
      fireEvent.press(sourceButton);
    });
    await waitFor(() => expect(view.getByTestId('embed-player-screen')).toBeTruthy(), { timeout: 8000 });
    expect(view.getByTestId('embed-webview').props.source.uri).toBe(
      'https://kodik.info/episode/1401678/3aoXdn0dc9e43d/720p',
    );

    await act(async () => {
      fireEvent.press(view.getByTestId('embed-close'));
    });
    await waitFor(() => expect(view.getByTestId('player-screen')).toBeTruthy(), { timeout: 8000 });

    await view.unmount();
  });
});
