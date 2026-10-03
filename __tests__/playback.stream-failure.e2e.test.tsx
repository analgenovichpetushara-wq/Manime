import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PlayerScreen } from '@/features/player/PlayerScreen';
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
        </Stack.Navigator>,
      ),
    );

    // No crash: the screen renders and stays operable while the stream is unresolved.
    await waitFor(() => expect(view.getByTestId('player-screen')).toBeTruthy(), { timeout: 8000 });
    expect(view.getByTestId('player-back')).toBeTruthy();

    await view.unmount();
  });
});
