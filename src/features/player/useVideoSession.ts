import { useCallback, useEffect, useRef, useState } from 'react';
import { createVideoPlayer, type PlayerError, type SubtitleTrack, type VideoPlayer } from 'expo-video';
import { clamp } from '@/core/utils/collections';
import { createLogger } from '@/core/logging/logger';

const log = createLogger('player');

export type VideoSessionStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

export interface VideoSession {
  /** Passed to `<VideoView player={...} />`; never mutated from outside this hook. */
  player: VideoPlayer | null;
  status: VideoSessionStatus;
  error: PlayerError | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  bufferedSec: number;
  playbackRate: number;
  /** Subtitle tracks embedded in the media itself (HLS/MP4), if the source exposes any. */
  subtitleTracks: SubtitleTrack[];
  activeSubtitleTrack: SubtitleTrack | null;
  load: (url: string | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  selectSubtitleTrack: (track: SubtitleTrack | null) => void;
  position: () => number;
  duration: () => number;
  isPlayingNow: () => boolean;
  rate: () => number;
}

/**
 * Imperative bridge around the native video player.
 *
 * The player is a non-reactive native object: it is created inside an effect, kept in a
 * ref and only ever mutated through the command functions below, while the reactive
 * numbers (position, duration, status) are pushed into React state by player events.
 */
export function useVideoSession(initialRate = 1): VideoSession {
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [status, setStatus] = useState<VideoSessionStatus>('idle');
  const [error, setError] = useState<PlayerError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [bufferedSec, setBufferedSec] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(initialRate);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState<SubtitleTrack | null>(null);

  const handle = useRef<VideoPlayer | null>(null);
  const rateRef = useRef(initialRate);

  useEffect(() => {
    let live = true;
    // Creating the native player asynchronously keeps it out of the render pass.
    void Promise.resolve().then(() => {
      if (!live) return;
      try {
        const instance = createVideoPlayer(null);
        instance.timeUpdateEventInterval = 0.5;
        instance.staysActiveInBackground = true;
        instance.playbackRate = rateRef.current;
        handle.current = instance;
        setPlayer(instance);
      } catch (caught) {
        log.error('cannot create video player', { error: String(caught) });
        setStatus('error');
        setError({ message: String(caught) } as PlayerError);
      }
    });

    return () => {
      live = false;
      const active = handle.current;
      handle.current = null;
      setPlayer(null);
      try {
        active?.release();
      } catch (caught) {
        log.warn('player release failed', { error: String(caught) });
      }
    };
  }, []);

  useEffect(() => {
    const active = handle.current;
    if (!player || !active) return;

    const subscriptions = [
      active.addListener('statusChange', (payload) => {
        if (payload.status === 'error') setStatus('error');
        else if (payload.status === 'loading') setStatus('loading');
        else if (payload.status === 'readyToPlay') setStatus('readyToPlay');
        else setStatus('idle');
        if (payload.error) setError(payload.error);
        else if (payload.status === 'readyToPlay') setError(null);
      }),
      active.addListener('playingChange', (payload) => setIsPlaying(payload.isPlaying)),
      active.addListener('timeUpdate', (payload) => {
        setPositionSec(payload.currentTime);
        setBufferedSec(payload.bufferedPosition ?? 0);
        // Some HLS playlists report their duration late: adopt it as soon as it exists.
        const total = active.duration;
        if (Number.isFinite(total) && total > 0) setDurationSec((current) => (current > 0 ? current : total));
      }),
      active.addListener('playbackRateChange', (payload) => {
        rateRef.current = payload.playbackRate;
        setPlaybackRateState(payload.playbackRate);
      }),
      active.addListener('sourceChange', () => {
        setPositionSec(0);
        setBufferedSec(0);
      }),
      active.addListener('sourceLoad', (payload) => {
        if (Number.isFinite(payload.duration) && payload.duration > 0) setDurationSec(payload.duration);
        setSubtitleTracks(payload.availableSubtitleTracks ?? []);
      }),
      active.addListener('availableSubtitleTracksChange', (payload) => {
        setSubtitleTracks(payload.availableSubtitleTracks ?? []);
      }),
      active.addListener('subtitleTrackChange', (payload) => setActiveSubtitleTrack(payload.subtitleTrack)),
      active.addListener('playToEnd', () => {
        setIsPlaying(false);
        setPositionSec((current) => current);
      }),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, [player]);

  const load = useCallback((url: string | null) => {
    const active = handle.current;
    if (!active) return;
    setError(null);
    setStatus(url ? 'loading' : 'idle');
    try {
      active.replace(url);
      active.playbackRate = rateRef.current;
    } catch (caught) {
      log.error('cannot load source', { error: String(caught) });
      setStatus('error');
    }
  }, []);

  const play = useCallback(() => {
    try {
      handle.current?.play();
    } catch (caught) {
      log.warn('play failed', { error: String(caught) });
    }
  }, []);

  const pause = useCallback(() => {
    try {
      handle.current?.pause();
    } catch (caught) {
      log.warn('pause failed', { error: String(caught) });
    }
  }, []);

  const togglePlay = useCallback(() => {
    const active = handle.current;
    if (!active) return;
    if (active.playing) active.pause();
    else active.play();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const active = handle.current;
    if (!active) return;
    const total = active.duration;
    const target = clamp(seconds, 0, Number.isFinite(total) && total > 0 ? total : Number.MAX_SAFE_INTEGER);
    active.currentTime = target;
    setPositionSec(target);
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const active = handle.current;
    if (!active) return;
    const total = active.duration;
    const target = clamp(active.currentTime + seconds, 0, Number.isFinite(total) && total > 0 ? total : Number.MAX_SAFE_INTEGER);
    active.currentTime = target;
    setPositionSec(target);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    rateRef.current = rate;
    const active = handle.current;
    if (active) active.playbackRate = rate;
  }, []);

  const selectSubtitleTrack = useCallback((track: SubtitleTrack | null) => {
    const active = handle.current;
    if (!active) return;
    active.subtitleTrack = track;
    setActiveSubtitleTrack(track);
  }, []);

  const setVolume = useCallback((volume: number) => {
    const active = handle.current;
    if (active) active.volume = clamp(volume, 0, 1);
  }, []);

  const currentPosition = useCallback(() => handle.current?.currentTime ?? 0, []);
  const currentDuration = useCallback(() => {
    const active = handle.current;
    const total = active?.duration ?? 0;
    return Number.isFinite(total) && total > 0 ? total : 0;
  }, []);
  const isPlayingNow = useCallback(() => handle.current?.playing ?? false, []);
  const currentRate = useCallback(() => handle.current?.playbackRate ?? rateRef.current, []);

  return {
    player,
    status,
    error,
    isPlaying,
    positionSec,
    durationSec,
    bufferedSec,
    playbackRate,
    subtitleTracks,
    activeSubtitleTrack,
    load,
    play,
    pause,
    togglePlay,
    seekTo,
    seekBy,
    setPlaybackRate,
    setVolume,
    selectSubtitleTrack,
    position: currentPosition,
    duration: currentDuration,
    isPlayingNow,
    rate: currentRate,
  };
}
