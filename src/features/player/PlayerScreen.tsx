import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { VideoView, type VideoView as VideoViewType } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { ErrorView } from '@/ui/StateViews';
import { BackgroundLayer } from '@/ui/BackgroundLayer';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useAppShell } from '@/navigation/AppShell';
import type { RootStackParamList } from '@/navigation/types';
import type { Episode, Voiceover } from '@/data/models/anime';
import { fetchEpisodes, fetchVoiceovers, fetchEmbedLink, supportsEmbedLink, describeError } from '@/services/providerService';
import {
  persistProgress,
  preparePlayback,
  recordEpisodeCompleted,
  resumePositionFor,
  type PlaybackPlan,
} from '@/services/playbackService';
import { settingsActions, useSettingsStore } from '@/store/settingsStore';
import { useProgressStore } from '@/store/progressStore';
import { Timeline } from '@/features/player/Timeline';
import { activeCue, parseSubtitles, type SubtitleCue } from '@/features/player/subtitles';
import { useVideoSession } from '@/features/player/useVideoSession';
import { useWatchTogetherSync } from '@/features/watchtogether/useWatchTogetherSync';

type PlayerRoute = RouteProp<RootStackParamList, 'Player'>;

const SEEK_STEP = 10;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const INTRO_PROMPT_WINDOW = 25;
const CONTROLS_TIMEOUT = 4200;
const PROGRESS_INTERVAL = 5000;
const COMPLETION_EPSILON = 1.5;

/** Native player surface, media controls and Watch Together-aware playback. */
export function PlayerScreen() {
  const route = useRoute<PlayerRoute>();
  const navigation = useAppNavigation();
  const theme = useTheme();
  const { t } = useText();
  const { showToast } = useAppShell();
  const settings = useSettingsStore();
  const progressState = useProgressStore();

  const { title, synced, roomCode } = route.params;
  const preferredProviderId = route.params.providerId ?? title.providerId;

  const session = useVideoSession(settings.playbackSpeed);
  const {
    player,
    status,
    isPlaying,
    positionSec,
    durationSec,
    playbackRate,
    subtitleTracks,
    load,
    play,
    pause,
    seekTo,
    seekBy,
    setPlaybackRate,
    selectSubtitleTrack,
    position,
    isPlayingNow,
    rate,
    togglePlay,
  } = session;
  const videoRef = useRef<VideoViewType | null>(null);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | undefined>(route.params.episodeId ?? undefined);
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>([]);
  const [voiceoverId, setVoiceoverId] = useState<string | undefined>(route.params.voiceoverId);
  const [qualityId, setQualityId] = useState<string | undefined>(undefined);
  const [plan, setPlan] = useState<PlaybackPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ messageKey: string; detail?: string } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [episodeDrawer, setEpisodeDrawer] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [scrubPositionOverride, setScrubPositionOverride] = useState<number | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [attempts, setAttempts] = useState(0);

  const durationRef = useRef(0);
  const resumedRef = useRef<string | null>(null);
  const completedRef = useRef<string | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScreenPosition = scrubPositionOverride ?? positionSec;
  const currentEpisode = useMemo(
    () => episodes.find((episode) => episode.id === currentEpisodeId) ?? episodes[0],
    [episodes, currentEpisodeId],
  );
  const currentIndex = useMemo(
    () => episodes.findIndex((episode) => episode.id === currentEpisode?.id),
    [episodes, currentEpisode],
  );
  const source = plan?.source;

  /* ---------------------------------------------------------------- data --- */

  /** Episode list for the chosen provider; an empty list stays empty (never invented). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const outcome = await fetchEpisodes(title, preferredProviderId);
        if (cancelled) return;
        setEpisodes(outcome.episodes);
        setCurrentEpisodeId((current) => current ?? outcome.episodes[0]?.id);
      } catch {
        if (!cancelled) setEpisodes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [title, preferredProviderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchVoiceovers(title, preferredProviderId);
        if (cancelled) return;
        setVoiceovers(list);
        setVoiceoverId((current) => current ?? list.find((item) => item.isDefault)?.id ?? list[0]?.id);
      } catch {
        if (!cancelled) setVoiceovers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [title, preferredProviderId]);

  /* -------------------------------------------------------------- stream --- */

  /** Resolve a stream for the current episode / voiceover / quality, with fallback. */
  useEffect(() => {
    if (!currentEpisode) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const nextPlan = await preparePlayback(title, currentEpisode, { voiceoverId, qualityId, preferredProviderId });
        if (cancelled) return;
        setPlan(nextPlan);
        setSubtitles([]);
        resumedRef.current = null;
        completedRef.current = null;
        load(nextPlan.source.url);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        setPlan(null);
        setLoading(false);
        setError(describeError(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
    // `load`, `title` and `player` are stable; re-resolving is driven by the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEpisode?.id, voiceoverId, qualityId, preferredProviderId, attempts]);

  /** Resume near the previous stop point once the source is ready. */
  useEffect(() => {
    if (!plan || !currentEpisode) return;
    if (status !== 'readyToPlay') return;
    const key = `${currentEpisode.id}:${plan.source.id}`;
    if (resumedRef.current === key) return;
    resumedRef.current = key;
    const resume = resumePositionFor(title.id, currentEpisode.id);
    const total = durationSec || currentEpisode.durationSec || 0;
    if (resume > 5 && (!total || resume < total - 10)) {
      seekTo(resume);
      showToast({ titleKey: 'player.resumed', params: { time: Math.round(resume) } });
    }
  }, [plan, status, currentEpisode, title.id, durationSec, seekTo, showToast]);

  /** Keep an authoritative duration: native first, episode metadata as a fallback. */
  useEffect(() => {
    const value = durationSec > 0 ? durationSec : currentEpisode?.durationSec ?? 0;
    durationRef.current = value;
  }, [durationSec, currentEpisode?.durationSec]);

  /* ------------------------------------------------------------ progress --- */

  const persist = useCallback(
    (completed: boolean) => {
      if (!currentEpisode || !plan) return;
      const total = completed ? durationRef.current || currentEpisode.durationSec || 0 : durationRef.current;
      const at = completed ? total : position();
      persistProgress({
        title,
        episode: currentEpisode,
        providerId: plan.bundle.providerId,
        positionSec: at,
        durationSec: total,
        voiceoverId,
        qualityId: plan.source.qualityId,
        completed,
      });
    },
    [currentEpisode, plan, title, voiceoverId, position],
  );

  const completeCurrentEpisode = useCallback(() => {
    if (!currentEpisode || !plan) return;
    const key = `${currentEpisode.id}:${plan.source.id}`;
    if (completedRef.current === key) return;
    completedRef.current = key;
    const voiceover = voiceovers.find((item) => item.id === voiceoverId);
    recordEpisodeCompleted({
      title,
      episode: currentEpisode,
      providerId: plan.bundle.providerId,
      positionSec: durationRef.current,
      durationSec: durationRef.current || currentEpisode.durationSec || 0,
      voiceoverId,
      qualityId: plan.source.qualityId,
      completed: true,
      episodes,
      voiceoverKind: voiceover?.kind,
      subtitles: settings.subtitleEnabled && subtitles.length > 0,
      withFriend: Boolean(synced),
    });
    if (settings.autoPlayNext && currentIndex >= 0 && currentIndex < episodes.length - 1) {
      const next = episodes[currentIndex + 1];
      if (next) setCurrentEpisodeId(next.id);
    }
  }, [
    currentEpisode,
    plan,
    title,
    voiceoverId,
    episodes,
    settings.autoPlayNext,
    settings.subtitleEnabled,
    subtitles.length,
    synced,
    currentIndex,
    voiceovers,
  ]);

  /** Periodic + lifecycle persistence; also flushes when the screen unmounts. */
  useEffect(() => {
    if (!plan) return;
    const interval = setInterval(() => persist(false), PROGRESS_INTERVAL);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist(false);
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
      persist(false);
    };
  }, [plan, persist]);

  /**
   * Completion detection driven by player events (never a poller): the end of the
   * source and the end-of-media threshold both mark the episode as watched.
   */
  useEffect(() => {
    if (!player || !plan) return;
    const markIfFinished = (at: number) => {
      const total = durationRef.current;
      if (total > 0 && at >= total - COMPLETION_EPSILON) completeCurrentEpisode();
    };
    const subscriptions = [
      player.addListener('playToEnd', () => completeCurrentEpisode()),
      player.addListener('timeUpdate', (payload) => markIfFinished(payload.currentTime)),
    ];
    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, [player, plan, completeCurrentEpisode]);

  /* ----------------------------------------------------------- subtitles --- */

  const subtitleUrl = (source as { subtitleUrl?: string } | undefined)?.subtitleUrl;
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!settings.subtitleEnabled || !subtitleUrl) {
        setSubtitles([]);
        return;
      }
      try {
        const response = await fetch(subtitleUrl);
        const text = await response.text();
        if (!cancelled) setSubtitles(parseSubtitles(text));
      } catch {
        if (!cancelled) setSubtitles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subtitleUrl, settings.subtitleEnabled]);

  const activeSubtitle = settings.subtitleEnabled ? activeCue(subtitles, onScreenPosition) : null;

  /* -------------------------------------------------------------- watch together --- */

  const localStateRef = useRef(() => readLocalState());
  const readLocalState = () => ({
    episodeId: currentEpisode?.id ?? '',
    episodeOrdinal: currentEpisode?.ordinal ?? 1,
    positionSec: position(),
    isPlaying: isPlayingNow(),
    rate: rate(),
    titleId: title.id,
  });
  useEffect(() => {
    localStateRef.current = readLocalState;
  });

  const syncCommands = useMemo(
    () => ({ play, pause, setRate: setPlaybackRate, isPlaying: isPlayingNow, rate }),
    [play, pause, setPlaybackRate, isPlayingNow, rate],
  );

  const onRemoteEpisode = useCallback(
    (episodeId: string) => {
      const target = episodes.find((item) => item.id === episodeId);
      if (target) setCurrentEpisodeId(target.id);
    },
    [episodes],
  );

  const onRemoteSeek = useCallback(
    (seconds: number) => {
      seekTo(seconds);
    },
    [seekTo],
  );

  const sync = useWatchTogetherSync({
    enabled: Boolean(synced && roomCode),
    roomCode: roomCode ?? '',
    isHost: route.params.roomRole === 'host',
    displayName: settings.watchTogetherDisplayName ?? 'Guest',
    commands: syncCommands,
    localState: () => localStateRef.current(),
    onRemoteEpisode,
    onRemoteSeek,
  });
  const notifySeek = sync.notifySeek;

  /** Manual seek: local player plus the room when this device is the host. */
  const seekToAndNotify = useCallback(
    (seconds: number) => {
      seekTo(seconds);
      setScrubPositionOverride(null);
      notifySeek(seconds);
    },
    [seekTo, notifySeek],
  );

  /* ------------------------------------------------------------- controls --- */

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_TIMEOUT);
  }, []);

  useEffect(() => {
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_TIMEOUT);
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  const toggleControls = useCallback(() => {
    setControlsVisible((current) => {
      const next = !current;
      if (next) revealControls();
      return next;
    });
  }, [revealControls]);

  const introSkipWindow = useMemo(() => {
    if (!plan?.skipIntro || !settings.skipIntro || synced) return null;
    const { start, end } = plan.skipIntro;
    if (onScreenPosition < start - INTRO_PROMPT_WINDOW || onScreenPosition >= end) return null;
    return { start, end };
  }, [plan, settings.skipIntro, synced, onScreenPosition]);

  /**
   * Sources that publish an official player link (Kodik) are played inside the
   * provider's own player; the episode link wins, otherwise the title is
   * resolved through the documented /get-player endpoint.
   */
  const openSourcePlayer = useCallback(async () => {
    const url = currentEpisode?.playerUrl ?? (await fetchEmbedLink(title));
    if (!url) {
      showToast({ titleKey: 'errors.stream_unavailable', tone: 'default' });
      return;
    }
    navigation.navigate('EmbedPlayer', { url, title: title.title });
  }, [currentEpisode?.playerUrl, title, navigation, showToast]);

  const errorMessageKey = error?.messageKey ?? 'errors.stream_unavailable';
  const busy = loading || status === 'loading';
  const playbackError = status === 'error';

  return (
    <View style={styles.container} testID="player-screen">
      <BackgroundLayer screen="player" testID="player-background" />
      <Pressable style={styles.videoWrap} onPress={toggleControls} accessibilityRole="button" testID="player-surface">
        {player && source ? (
          <VideoView
            ref={videoRef}
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
          />
        ) : (
          <View style={styles.placeholder}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <ErrorView
                  messageKey={playbackError ? 'errors.stream_unavailable' : errorMessageKey}
                  detail={error?.detail}
                  onRetry={() => setAttempts((value) => value + 1)}
                />
                {/* Sources that publish an official player page instead of a media
                    URL (Kodik) stay playable through the provider's own player. */}
                {currentEpisode?.playerUrl || supportsEmbedLink(title) ? (
                  <Button
                    label={t('player.openSourcePlayer')}
                    variant="secondary"
                    onPress={() => {
                      void openSourcePlayer();
                    }}
                    testID="player-open-source"
                  />
                ) : null}
              </>
            )}
          </View>
        )}

        {activeSubtitle ? (
          <View style={[styles.subtitleBox, { backgroundColor: `rgba(0,0,0,${settings.subtitleBackgroundOpacity})` }]}>
            <AppText
              center
              style={{
                color: settings.subtitleTextColor ?? '#ffffff',
                fontSize: theme.typography.sizes.sm * settings.subtitleFontScale,
                fontWeight: settings.subtitleFontWeight === 'bold' ? '700' : '400',
              }}
            >
              {activeSubtitle.text}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      {controlsVisible || !source ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.iconButton} testID="player-back">
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </Pressable>
            <View style={styles.titleWrap}>
              <AppText variant="sm" weight="700" numberOfLines={1} style={styles.whiteText}>
                {title.title}
              </AppText>
              <AppText variant="xs" numberOfLines={1} style={styles.mutedText}>
                {currentEpisode
                  ? t('lists.episodeOf', { current: currentEpisode.ordinal, name: currentEpisode.name ?? '' })
                  : t('player.episodePending')}
              </AppText>
            </View>
            {synced ? <Chip label={sync.statusLabel} tone={sync.isHost ? 'primary' : 'default'} testID="player-sync-chip" /> : null}
            <Pressable onPress={() => setSettingsSheet(true)} accessibilityRole="button" style={styles.iconButton} testID="player-settings">
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          {introSkipWindow ? (
            <Pressable
              onPress={() => seekToAndNotify(introSkipWindow.end)}
              style={[styles.skipButton, { backgroundColor: theme.colors.accent }]}
              testID="player-skip-intro"
            >
              <AppText variant="sm" weight="700" style={{ color: theme.colors.accentText }}>
                {t('player.skipIntro')}
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.bottomBar}>
            <Timeline
              positionSec={onScreenPosition}
              durationSec={durationSec || currentEpisode?.durationSec || 0}
              bufferedSec={session.bufferedSec}
              onSeek={seekToAndNotify}
              onScrubStart={() => {
                setScrubbing(true);
                setScrubPositionOverride(position());
              }}
              onScrubEnd={() => setScrubbing(false)}
              disabled={!source}
            />

            <View style={styles.controlRow}>
              <Pressable
                onPress={() => {
                  seekBy(-SEEK_STEP);
                  notifySeek(position() - SEEK_STEP);
                }}
                accessibilityRole="button"
                style={styles.iconButton}
                testID="player-backward"
              >
                <Ionicons name="play-back" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={togglePlay} accessibilityRole="button" style={styles.playButton} testID="player-play-pause">
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  seekBy(SEEK_STEP);
                  notifySeek(position() + SEEK_STEP);
                }}
                accessibilityRole="button"
                style={styles.iconButton}
                testID="player-forward"
              >
                <Ionicons name="play-forward" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  const target = episodes[currentIndex - 1];
                  if (!target) return;
                  setCurrentEpisodeId(target.id);
                  sync.notifyEpisode(target.id, target.ordinal);
                }}
                accessibilityRole="button"
                style={[styles.iconButton, { opacity: currentIndex > 0 ? 1 : 0.4 }]}
                testID="player-prev-episode"
              >
                <Ionicons name="play-skip-back" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  const target = episodes[currentIndex + 1];
                  if (!target) return;
                  setCurrentEpisodeId(target.id);
                  sync.notifyEpisode(target.id, target.ordinal);
                }}
                accessibilityRole="button"
                style={[styles.iconButton, { opacity: currentIndex >= 0 && currentIndex < episodes.length - 1 ? 1 : 0.4 }]}
                testID="player-next-episode"
              >
                <Ionicons name="play-skip-forward" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={() => setEpisodeDrawer(true)} accessibilityRole="button" style={styles.iconButton} testID="player-episodes">
                <Ionicons name="list" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (videoRef.current) void videoRef.current.enterFullscreen();
                }}
                accessibilityRole="button"
                style={styles.iconButton}
                testID="player-fullscreen"
              >
                <Ionicons name="expand" size={20} color="#fff" />
              </Pressable>
            </View>

            {busy ? (
              <AppText variant="xs" style={styles.mutedText}>
                {t('player.buffering')}
              </AppText>
            ) : scrubbing ? (
              <AppText variant="xs" style={styles.mutedText}>
                {t('player.seeking')}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}

      <ModalSheet
        visible={episodeDrawer}
        onClose={() => setEpisodeDrawer(false)}
        title={t('player.episodes')}
        presentation="sheet"
        testID="player-episode-drawer"
      >
        <ScrollView style={styles.episodeList} contentContainerStyle={styles.episodeListContent}>
          {episodes.length ? (
            episodes.map((episode) => {
              const watched = progressState.entries[title.id];
              const isCurrent = episode.id === currentEpisode?.id;
              const isWatched = watched
                ? watched.episodeOrdinal > episode.ordinal || (watched.episodeId === episode.id && watched.completed)
                : false;
              return (
                <Pressable
                  key={episode.id}
                  onPress={() => {
                    setCurrentEpisodeId(episode.id);
                    sync.notifyEpisode(episode.id, episode.ordinal);
                    setEpisodeDrawer(false);
                  }}
                  style={[
                    styles.episodeRow,
                    {
                      backgroundColor: isCurrent ? theme.colors.surfaceAlt : 'transparent',
                      borderColor: theme.colors.cardBorder,
                      borderRadius: theme.shapes.radius.md,
                    },
                  ]}
                  testID={`episode-${episode.ordinal}`}
                >
                  <AppText variant="sm" weight={isCurrent ? '700' : '500'}>
                    {episode.ordinal}. {episode.name ?? t('common.episode')}
                  </AppText>
                  <View style={styles.episodeMeta}>
                    {episode.durationSec ? (
                      <AppText variant="xs" tone="muted">
                        {Math.round(episode.durationSec / 60)} {t('common.minutesShort')}
                      </AppText>
                    ) : null}
                    {isWatched ? <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} /> : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <AppText variant="sm" tone="muted">
              {t('errors.missing_episode')}
            </AppText>
          )}
        </ScrollView>
      </ModalSheet>

      <ModalSheet
        visible={settingsSheet}
        onClose={() => setSettingsSheet(false)}
        title={t('player.settings')}
        presentation="sheet"
        testID="player-settings-sheet"
      >
        <View style={styles.sheetSection}>
          <AppText variant="sm" weight="700">
            {t('player.quality')}
          </AppText>
          <View style={styles.chipRow}>
            {(plan?.qualities ?? []).map((quality) => (
              <Chip
                key={quality.id}
                label={quality.label}
                selected={plan?.source.qualityId === quality.id}
                onPress={() => {
                  persist(false);
                  setQualityId(quality.id);
                }}
                testID={`quality-${quality.id}`}
              />
            ))}
            {plan ? null : (
              <AppText variant="xs" tone="muted">
                {t('errors.stream_unavailable')}
              </AppText>
            )}
          </View>
        </View>

        <View style={styles.sheetSection}>
          <AppText variant="sm" weight="700">
            {t('player.voiceover')}
          </AppText>
          <View style={styles.chipRow}>
            {voiceovers.length ? (
              voiceovers.map((voiceover) => (
                <Chip
                  key={voiceover.id}
                  label={`${voiceover.name} · ${t(`voiceover.${voiceover.kind}`)}`}
                  selected={voiceover.id === voiceoverId}
                  onPress={() => {
                    persist(false);
                    setVoiceoverId(voiceover.id);
                  }}
                  testID={`voiceover-${voiceover.id}`}
                />
              ))
            ) : (
              <AppText variant="xs" tone="muted">
                {t('details.noVoiceovers')}
              </AppText>
            )}
          </View>
        </View>

        <View style={styles.sheetSection}>
          <AppText variant="sm" weight="700">
            {t('player.speed')}
          </AppText>
          <View style={styles.chipRow}>
            {SPEEDS.map((speed) => (
              <Chip
                key={speed}
                label={`${speed}x`}
                selected={Math.abs(playbackRate - speed) < 0.01}
                onPress={() => {
                  setPlaybackRate(speed);
                  settingsActions.setPlaybackSpeed(speed);
                }}
                testID={`speed-${speed}`}
              />
            ))}
          </View>
        </View>

        <View style={styles.sheetSection}>
          <AppText variant="sm" weight="700">
            {t('player.subtitles')}
          </AppText>
          <View style={styles.chipRow}>
            <Chip
              label={settings.subtitleEnabled ? t('common.on') : t('common.off')}
              selected={settings.subtitleEnabled}
              onPress={() => settingsActions.set('subtitleEnabled', !settings.subtitleEnabled)}
              testID="toggle-subs"
            />
            {[0.9, 1.1, 1.3].map((scale) => (
              <Chip
                key={scale}
                label={`${scale}x`}
                selected={Math.abs(settings.subtitleFontScale - scale) < 0.01}
                onPress={() => settingsActions.set('subtitleFontScale', scale)}
              />
            ))}
          </View>
          {subtitleTracks.length ? (
            <View style={styles.chipRow}>
              {subtitleTracks.map((track) => (
                <Chip
                  key={`${track.language}-${track.label}`}
                  label={track.label}
                  selected={session.activeSubtitleTrack?.label === track.label}
                  onPress={() => selectSubtitleTrack(track)}
                />
              ))}
            </View>
          ) : null}
          {subtitles.length === 0 && subtitleTracks.length === 0 ? (
            <AppText variant="xs" tone="muted">
              {t('player.noSubtitles')}
            </AppText>
          ) : null}
        </View>

        <View style={styles.sheetSection}>
          <AppText variant="sm" weight="700">
            {t('player.actions')}
          </AppText>
          <View style={styles.chipRow}>
            <Chip
              label={`${t('player.autoNext')}: ${settings.autoPlayNext ? t('common.on') : t('common.off')}`}
              onPress={() => settingsActions.set('autoPlayNext', !settings.autoPlayNext)}
            />
            <Chip
              label={`${t('settings.skipIntro')}: ${settings.skipIntro ? t('common.on') : t('common.off')}`}
              onPress={() => settingsActions.set('skipIntro', !settings.skipIntro)}
            />
            <Chip
              label={t('player.markWatched')}
              onPress={() => {
                completeCurrentEpisode();
                showToast({ titleKey: 'player.progressSaved', tone: 'default' });
              }}
            />
          </View>
        </View>

        {plan ? (
          <View style={styles.sheetSection}>
            <AppText variant="xs" tone="muted">
              {t('player.sourceInfo', { provider: plan.bundle.providerId, format: plan.source.kind.toUpperCase() })}
            </AppText>
            <Button
              label={t('player.switchProvider')}
              variant="secondary"
              onPress={() => {
                setSettingsSheet(false);
                setQualityId(undefined);
                setAttempts((value) => value + 1);
              }}
              testID="player-retry"
            />
          </View>
        ) : null}
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoWrap: { flex: 1, justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtitleBox: { position: 'absolute', left: 24, right: 24, bottom: 96, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 28,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleWrap: { flex: 1 },
  whiteText: { color: '#fff' },
  mutedText: { color: 'rgba(255,255,255,0.7)' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bottomBar: { gap: 6 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipButton: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  episodeList: { maxHeight: 420 },
  episodeListContent: { gap: 6 },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  episodeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sheetSection: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
