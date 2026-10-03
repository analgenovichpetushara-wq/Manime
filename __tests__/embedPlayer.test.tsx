import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { EmbedPlayerScreen } from '@/features/player/EmbedPlayerScreen';
import { wrap } from './helpers/playbackHarness';

const Stack = createNativeStackNavigator<RootStackParamList>();

function renderEmbed(params: RootStackParamList['EmbedPlayer']) {
  return wrap(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmbedPlayer" component={EmbedPlayerScreen} initialParams={params} />
    </Stack.Navigator>,
  );
}

describe('source embed player', () => {
  it('loads the official Kodik player link in the web view', async () => {
    const view = await render(
      renderEmbed({
        url: 'https://kodik.info/serial/42758/bb173bb49a1d7bd2d8a7ca43c70a4082/720p',
        title: 'Наруто [ТВ-1]',
      }),
    );

    await waitFor(() => expect(view.getByTestId('embed-player-screen')).toBeTruthy());
    const web = view.getByTestId('embed-webview');
    expect(web.props.source.uri).toBe('https://kodik.info/serial/42758/bb173bb49a1d7bd2d8a7ca43c70a4082/720p');
    expect(view.getByTestId('embed-title').props.children).toBe('Наруто [ТВ-1]');
    expect(view.getByTestId('embed-close')).toBeTruthy();

    await view.unmount();
  });

  it('refuses to load anything that is not an http(s) link', async () => {
    const view = await render(renderEmbed({ url: 'javascript:alert(1)', title: 'Наруто' }));

    await waitFor(() => expect(view.getByTestId('embed-player-screen')).toBeTruthy());
    expect(view.queryByTestId('embed-webview')).toBeNull();

    await view.unmount();
  });
});
