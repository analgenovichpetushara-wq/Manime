import { useCallback, useEffect, useRef, useState } from 'react';
import { env } from '@/core/config/env';
import { useSettingsStore } from '@/store/settingsStore';
import { WatchTogetherClient, type RoomSnapshot, type WatchTogetherStatus } from '@/features/watchtogether/sync/client';
import { evaluateDrift, type LocalPlaybackSnapshot } from '@/features/watchtogether/sync/syncEngine';
import type { SyncPlaybackState } from '@/data/models/watchTogether';

/** Playback commands the caller must provide; the hook never touches the player directly. */
export interface SyncPlaybackCommands {
  play: () => void;
  pause: () => void;
  setRate: (rate: number) => void;
  /** True while the local player is playing. */
  isPlaying: () => boolean;
  /** Current playback rate. */
  rate: () => number;
}

export interface WatchTogetherSyncOptions {
  enabled: boolean;
  roomCode: string;
  isHost?: boolean;
  displayName: string;
  commands: SyncPlaybackCommands;
  /** Read lazily on every correction tick so the numbers are never stale. */
  localState: () => LocalPlaybackSnapshot & { titleId: string; episodeOrdinal: number };
  onRemoteEpisode: (episodeId: string, ordinal: number) => void;
  onRemoteSeek: (positionSec: number) => void;
}

export interface WatchTogetherSyncResult {
  statusLabel: string;
  status: WatchTogetherStatus;
  isHost: boolean;
  participants: number;
  notifySeek: (positionSec: number) => void;
  notifyEpisode: (episodeId: string, ordinal: number) => void;
}

const STATUS_KEYS: Record<WatchTogetherStatus, string> = {
  idle: 'common.off',
  connecting: 'watchTogether.connecting',
  connected: 'watchTogether.connected',
  reconnecting: 'watchTogether.disconnected',
  closed: 'watchTogether.disconnected',
  unavailable: 'watchTogether.serverMissing',
};

/** How often a guest re-checks its drift against the host timeline. */
const CORRECTION_INTERVAL_MS = 1000;

/**
 * Keeps a player in sync with a Watch Together room.
 *
 * Playback stays local: only play/pause/seek/rate/episode markers travel.
 * Small drift is corrected gradually by nudging the rate, a hard seek happens
 * only when the difference is large (see `evaluateDrift`).
 */
export function useWatchTogetherSync(options: WatchTogetherSyncOptions): WatchTogetherSyncResult {
  const { enabled, roomCode, displayName, isHost: requestedHost, commands, onRemoteEpisode, onRemoteSeek } = options;
  const settings = useSettingsStore();

  // Latest-value refs, refreshed after every render so the timers below never
  // capture stale callbacks or numbers.
  const localRef = useRef(options.localState);
  const commandsRef = useRef(commands);
  const handlersRef = useRef({ onRemoteEpisode, onRemoteSeek });
  useEffect(() => {
    localRef.current = options.localState;
    commandsRef.current = commands;
    handlersRef.current = { onRemoteEpisode, onRemoteSeek };
  });

  const [status, setStatus] = useState<WatchTogetherStatus>(enabled && env.watchTogetherUrl ? 'connecting' : 'idle');
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const clientRef = useRef<WatchTogetherClient | null>(null);
  const remoteRef = useRef<SyncPlaybackState | null>(null);
  const lastBroadcast = useRef<{ isPlaying: boolean; episodeId: string } | null>(null);

  const isHost = snapshot ? snapshot.role === 'host' : Boolean(requestedHost);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!enabled || !roomCode || !env.watchTogetherUrl) {
        setStatus('idle');
        return;
      }
      const client = new WatchTogetherClient({
        url: env.watchTogetherUrl,
        roomId: roomCode.toUpperCase(),
        displayName,
        isHost: Boolean(requestedHost),
        handlers: {
          onStatus: (next) => setStatus(next),
          onRoomState: (room) => {
            setSnapshot(room);
            remoteRef.current = room.playback;
          },
          onPlayback: (playback) => {
            setSnapshot((current) => (current ? { ...current, playback } : current));
            remoteRef.current = playback;
          },
          onParticipants: (participants) => setSnapshot((current) => (current ? { ...current, participants } : current)),
          onError: () => setStatus('reconnecting'),
        },
      });
      if (cancelled) {
        client.disconnect();
        return;
      }
      clientRef.current = client;
      client.connect();
    })();
    return () => {
      cancelled = true;
      clientRef.current?.disconnect();
      clientRef.current = null;
      remoteRef.current = null;
      lastBroadcast.current = null;
    };
  }, [enabled, roomCode, displayName, requestedHost]);

  /** Host: broadcast local play/pause/episode transitions as they happen. */
  useEffect(() => {
    if (!enabled || !isHost) return;
    const interval = setInterval(() => {
      const client = clientRef.current;
      if (!client) return;
      const state = localRef.current();
      const current = { isPlaying: state.isPlaying, episodeId: state.episodeId };
      const previous = lastBroadcast.current;
      lastBroadcast.current = current;
      if (!previous) return;
      if (previous.episodeId !== current.episodeId) {
        client.sendEpisodeChange(state.episodeId, state.episodeOrdinal, state.titleId, state.positionSec);
        return;
      }
      if (previous.isPlaying !== current.isPlaying) {
        if (current.isPlaying) client.sendPlay(state.positionSec);
        else client.sendPause(state.positionSec);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [enabled, isHost]);

  /** Guest: correct drift on a fixed cadence (never per frame). */
  useEffect(() => {
    if (!enabled || isHost) return;
    const interval = setInterval(() => {
      const remote = remoteRef.current;
      if (!remote) return;
      const local = localRef.current();
      const decision = evaluateDrift(local, remote);
      const playback = commandsRef.current;
      switch (decision.action) {
        case 'seek':
          handlersRef.current.onRemoteSeek(decision.targetPositionSec);
          break;
        case 'episode-change':
          handlersRef.current.onRemoteEpisode(remote.episodeId, remote.episodeOrdinal);
          break;
        case 'play':
          if (!playback.isPlaying()) playback.play();
          break;
        case 'pause':
          if (playback.isPlaying()) playback.pause();
          break;
        case 'nudge':
          if (decision.suggestedRate) playback.setRate(decision.suggestedRate);
          break;
        default:
          if (
            Math.abs(decision.driftSec) < 0.12 &&
            !remote.isPlaying &&
            Math.abs(playback.rate() - settings.playbackSpeed) > 0.01
          ) {
            playback.setRate(settings.playbackSpeed);
          }
          break;
      }
    }, CORRECTION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, isHost, settings.playbackSpeed]);

  const notifySeek = useCallback(
    (positionSec: number) => {
      if (!clientRef.current || !isHost) return;
      clientRef.current.sendSeek(positionSec);
    },
    [isHost],
  );

  const notifyEpisode = useCallback(
    (episodeId: string, ordinal: number) => {
      if (!clientRef.current || !isHost) return;
      clientRef.current.sendEpisodeChange(episodeId, ordinal, localRef.current().titleId, 0);
    },
    [isHost],
  );

  return {
    status,
    statusLabel: STATUS_KEYS[status],
    isHost,
    participants: snapshot?.participants.length ?? 0,
    notifySeek,
    notifyEpisode,
  };
}
