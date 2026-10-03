import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';

/**
 * `App.tsx` mounts `SafeAreaProvider` without `initialMetrics` because a real
 * device measures them. The jest mock only renders children once metrics exist,
 * so the boot test supplies them.
 */
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports
  const ReactLib = require('react');
  const metrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };
  const Provider = ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
    ReactLib.createElement(actual.SafeAreaProvider, { initialMetrics: metrics, style }, children);
  return {
    ...actual,
    SafeAreaProvider: Provider,
    useSafeAreaInsets: () => metrics.insets,
    useSafeAreaFrame: () => metrics.frame,
  };
});

// Imported after the module mock above so App picks it up.
// eslint-disable-next-line import/first
import App from '@/App';
// eslint-disable-next-line import/first
import { installFetchStub } from './helpers/playbackHarness';

/**
 * Regression: the app must boot the real component tree.
 *
 * `AppShell` renders the global details dialog and the toast host, both of which
 * need a navigation object, so `NavigationContainer` has to sit *above* it.
 * While the container lived inside `RootNavigator` (a child of `AppShell`) the
 * first render threw and every launch degraded to the error boundary
 * («Что-то сломалось на этом экране»). Rendering the shipped `App` here keeps
 * that ordering honest.
 */
describe('application boot', () => {
  beforeEach(() => {
    installFetchStub();
  });

  it('renders the shipped App without falling back to the error boundary', async () => {
    const view = await render(<App />);
    await waitFor(() => expect(view.getByTestId('home-screen')).toBeTruthy(), { timeout: 20000 });
    expect(view.queryByTestId('error-boundary')).toBeNull();
    await waitFor(() => expect(view.getByTestId('tab-bar')).toBeTruthy(), { timeout: 20000 });
    await view.unmount();
  }, 30000);

  it('opens the global details dialog from the shell without a navigation error', async () => {
    const view = await render(<App />);
    await waitFor(() => expect(view.getByTestId('home-screen')).toBeTruthy(), { timeout: 20000 });

    const opener = await waitFor(
      () => {
        const cards = view.getAllByTestId(/^discover-/);
        if (!cards.length) throw new Error('no discover card yet');
        return cards[0]!;
      },
      { timeout: 20000 },
    );

    await act(async () => {
      fireEvent.press(opener);
    });

    await waitFor(() => expect(view.getByTestId('details-modal')).toBeTruthy(), { timeout: 20000 });
    expect(view.queryByTestId('error-boundary')).toBeNull();
    await view.unmount();
  }, 30000);
});
