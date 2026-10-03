import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SearchScreen } from '@/features/search/SearchScreen';
import { installFetchStub, requestedHosts, resetPlaybackState, TITLE_ID, wrap } from './helpers/playbackHarness';

jest.setTimeout(30_000);

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

describe('search through to playback', () => {
  it('searches a public provider, opens the details dialog and lists episodes and voiceovers', async () => {
    const view = await render(wrap(<SearchScreen />));

    // Typing alone drives the debounced global search, exactly like a user would.
    await act(async () => {
      fireEvent.changeText(view.getByTestId('search-input'), 'тестовый');
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    await waitFor(() => expect(requestedHosts.has('kodik-api.com')).toBe(true));
    const card = await waitFor(() => view.getByTestId(`search-result-${TITLE_ID}`), { timeout: 8000 });

    // Opening the result mounts the animated details dialog through the app shell.
    await act(async () => {
      fireEvent.press(card);
    });
    await waitFor(() => expect(view.getByTestId('details-modal')).toBeTruthy(), { timeout: 8000 });
    await waitFor(() => expect(view.getAllByText(/Наруто/).length).toBeGreaterThan(0));

    await view.unmount();
  });
});
