/* eslint-disable no-undef */
// React needs to know it is running inside a test renderer before the first update.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

process.env.EXPO_PUBLIC_ENV = 'test';
process.env.EXPO_PUBLIC_WATCH_TOGETHER_URL = 'ws://localhost:8787';
// Placeholder partner token: it only marks the Kodik client as configured so the
// real request/mapping code runs against the offline fetch stub. Never a real key.
process.env.EXPO_PUBLIC_KODIK_TOKEN = 'test-partner-token';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated 4 pulls in the worklets runtime (a native module) at import time,
// so both packages are replaced with lightweight stubs for the test environment.
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  createWorkletRuntime: () => ({ run: () => undefined }),
  runOnJS: (fn) => (...args) => fn(...args),
  runOnUI: (fn) => (...args) => fn(...args),
  isWorkletFunction: () => false,
  makeShareableCloneRecursive: (value) => value,
  shouldBeUseWeb: () => true,
  WorkletsModule: {},
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');
  const Animated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    createAnimatedComponent: (component) => component,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (initial) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory) => {
      try {
        return factory();
      } catch {
        return {};
      }
    },
    withTiming: (value) => value,
    withSpring: (value) => value,
    withDelay: (_delay, value) => value,
    withRepeat: (value) => value,
    withSequence: (...values) => values[values.length - 1],
    cancelAnimation: () => undefined,
    Easing: { linear: (value) => value, ease: (value) => value, inOut: (fn) => fn, out: (fn) => fn },
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: (value) => value,
    interpolateColor: (value) => String(value),
    Extrapolation: { CLAMP: 'clamp' },
    useAnimatedRef: () => React.createRef(),
    useAnimatedGestureHandler: () => ({}),
    Layout: { duration: () => ({}) },
    FadeIn: {},
    FadeOut: {},
  };
});

// expo-video is a native module: tests use a deterministic in-memory player.
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');

  let listeners = new Set();
  const emit = (event, payload) => {
    for (const entry of [...listeners]) {
      if (entry.event === event) entry.handler(payload);
    }
  };

  class FakeVideoPlayer {
    constructor() {
      this.playing = false;
      this.currentTime = 0;
      this.duration = 1440;
      this.playbackRate = 1;
      this.volume = 1;
      this.muted = false;
      this.status = 'idle';
      this.timeUpdateEventInterval = 0;
      this.staysActiveInBackground = false;
      this.subtitleTrack = null;
      this.loop = false;
      this.allowsExternalPlayback = true;
      this.audioMixingMode = 'auto';
    }

    addListener(event, handler) {
      const entry = { event, handler };
      listeners.add(entry);
      return { remove: () => listeners.delete(entry) };
    }

    replace(url) {
      this.status = 'readyToPlay';
      this.currentTime = 0;
      emit('statusChange', { status: 'readyToPlay', error: undefined });
      emit('sourceLoad', { videoSource: { uri: url }, duration: this.duration, availableVideoTracks: [], availableSubtitleTracks: [], availableAudioTracks: [] });
    }

    replaceAsync(url) {
      this.replace(url);
      return Promise.resolve();
    }

    play() {
      this.playing = true;
      emit('playingChange', { isPlaying: true });
    }

    pause() {
      this.playing = false;
      emit('playingChange', { isPlaying: false });
    }

    seekBy(seconds) {
      this.currentTime += seconds;
      emit('timeUpdate', { currentTime: this.currentTime, bufferedPosition: this.duration, currentLiveTimestamp: null, currentOffsetFromLive: null });
    }

    release() {
      listeners = new Set();
    }
  }

  return {
    __esModule: true,
    createVideoPlayer: () => new FakeVideoPlayer(),
    useVideoPlayer: () => React.useRef(new FakeVideoPlayer()).current,
    isPictureInPictureSupported: () => false,
    clearVideoCacheAsync: async () => undefined,
    setVideoCacheSizeAsync: async () => undefined,
    getCurrentVideoCacheSize: async () => 0,
    VideoView: (props) => React.createElement(View, { testID: props.testID ?? 'video-view' }),
    VideoAirPlayButton: () => null,
  };
});

// react-native-webview is a native module: tests render a placeholder that
// still records the URL the screen asked it to load.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) =>
    React.createElement(View, {
      ref,
      testID: props.testID ?? 'webview',
      source: props.source,
      onLayout: () => props.onLoadEnd?.(),
    }),
  );
  WebView.displayName = 'WebViewStub';
  return { __esModule: true, default: WebView, WebView };
});

// The logger is intentionally chatty; provider-failure tests do not need the noise.
jest.spyOn(console, 'warn').mockImplementation(() => {});
