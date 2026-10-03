import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import type { RootStackParamList } from '@/navigation/types';
import { useAppShell } from '@/navigation/AppShell';
import { env } from '@/core/config/env';
import { useSettingsStore } from '@/store/settingsStore';
import { useProfileStore } from '@/store/profileStore';
import { watchTogetherActions, useWatchTogetherStore } from '@/store/watchTogetherStore';
import { WatchTogetherClient, type RoomSnapshot, type WatchTogetherStatus } from '@/features/watchtogether/sync/client';
import { clampRate, evaluateDrift, projectPosition } from '@/features/watchtogether/sync/syncEngine';
import { titleCache } from '@/services/titleCache';
import { progressFor, useProgressStore } from '@/store/progressStore';
import type { AnimeTitle } from '@/data/models/anime';

const STATUS_KEYS: Record<WatchTogetherStatus, string> = {
  idle: 'common.off',
  connecting: 'watchTogether.connecting',
  connected: 'watchTogether.connected',
  reconnecting: 'watchTogether.reconnecting',
  closed: 'watchTogether.disconnected',
  unavailable: 'watchTogether.serverMissing',
};

type RoomRoute = RouteProp<RootStackParamList, 'Room'>;

export function RoomScreen() {
  const route = useRoute<RoomRoute>();
  return <RoomView params={route.params} />;
}

function RoomView({ params }: { params: RootStackParamList['Room'] }) {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const { t } = useText();
  const { showToast } = useAppShell();
  const settings = useSettingsStore();
  const profile = useProfileStore();
  const progress = useProgressStore();
  const store = useWatchTogetherStore();

  const clientRef = useRef<WatchTogetherClient | null>(null);
  const [status, setStatus] = useState<WatchTogetherStatus>(env.watchTogetherUrl ? 'connecting' : 'unavailable');
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [messages, setMessages] = useState<RoomSnapshot['messages']>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [local, setLocal] = useState({ positionSec: 0, isPlaying: false, rate: 1 });
  const [title, setTitle] = useState<AnimeTitle | null>(null);

  const displayName = store.displayName ?? settings.watchTogetherDisplayName ?? profile.profile.displayName ?? 'Guest';
  const isHost = snapshot?.role === 'host' || (!snapshot && params.isHost);

  /** Loads the title the room is about, if the host shared one. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (params.title) {
        setTitle(params.title);
        return;
      }
      const titleId = params.titleId;
      if (!titleId) return;
      const cached = await titleCache.getTitle(titleId);
      if (!cancelled && cached) setTitle(cached);
      const entry = progressFor(progress, titleId);
      if (!cancelled && entry && !params.episodeId) {
        setLocal((current) => ({ ...current, positionSec: entry.positionSec }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.titleId, params.title]);

  useEffect(() => {
    const client = new WatchTogetherClient({
      url: env.watchTogetherUrl,
      roomId: params.roomId,
      displayName,
      isHost: params.isHost,
      initialPlayback: {
        titleId: params.titleId ?? '',
        episodeId: params.episodeId ?? '',
        episodeOrdinal: 1,
        positionSec: 0,
        isPlaying: false,
        rate: 1,
        updatedAt: Date.now(),
      },
      handlers: {
        onStatus: setStatus,
        onRoomState: (room) => {
          setSnapshot(room);
          setMessages(room.messages);
        },
        onPlayback: (playback) => {
          setSnapshot((current) => (current ? { ...current, playback } : current));
          setLocal((current) => {
            const decision = evaluateDrift(
              { episodeId: playback.episodeId, positionSec: current.positionSec, isPlaying: current.isPlaying, rate: current.rate },
              playback,
            );
            return {
              positionSec: decision.action === 'seek' ? decision.targetPositionSec : projectPosition(playback),
              isPlaying: playback.isPlaying,
              rate: decision.action === 'nudge' && decision.suggestedRate ? decision.suggestedRate : clampRate(playback.rate || 1),
            };
          });
        },
        onParticipants: (participants) => setSnapshot((current) => (current ? { ...current, participants } : current)),
        onChat: (message) =>
          setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100))),
        onError: (code, message) => setError({ code, message }),
      },
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId, params.isHost, displayName]);

  useEffect(() => {
    return () => {
      watchTogetherActions.recordSession({
        roomId: params.roomId,
        code: snapshot?.code ?? params.code,
        joinedAt: Date.now(),
        role: isHost ? 'host' : 'guest',
        titleId: params.titleId,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  const sendChat = useCallback(() => {
    const text = chatDraft.trim();
    if (!text) return;
    clientRef.current?.sendChat(text, displayName);
    setChatDraft('');
  }, [chatDraft, displayName]);

  const roomCode = snapshot?.code || params.code;
  const participants = snapshot?.participants ?? [];
  const playbackPosition = snapshot ? projectPosition(snapshot.playback) : local.positionSec;

  const openSyncedPlayer = useCallback(() => {
    if (!title) {
      showToast({ titleKey: 'watchTogether.needTitle', tone: 'danger' });
      return;
    }
    navigation.navigate('Player', {
      title,
      episodeId: snapshot?.playback.episodeId || params.episodeId,
      episodeOrdinal: snapshot?.playback.episodeOrdinal ?? 1,
      providerId: title.providerId,
      synced: true,
      roomCode,
      roomRole: isHost ? 'host' : 'guest',
    });
  }, [title, navigation, snapshot, params.episodeId, roomCode, isHost, showToast]);

  return (
    <Screen screenId="watchTogether" testID="room-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.codeRow}>
            <AppText variant="xl" weight="800" display>
              {roomCode || '••••••'}
            </AppText>
            {roomCode ? (
              <Pressable
                accessibilityRole="button"
                testID="copy-room-code"
                onPress={async () => {
                  await Clipboard.setStringAsync(roomCode);
                  showToast({ titleKey: 'watchTogether.codeCopied', params: { code: roomCode }, tone: 'accent' });
                }}
                style={[styles.iconButton, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.sm }]}
              >
                <Ionicons name="copy-outline" size={16} color={theme.colors.text} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            <Chip label={t(STATUS_KEYS[status])} tone={status === 'connected' ? 'primary' : 'default'} />
            <Chip label={isHost ? t('watchTogether.host') : t('watchTogether.guest')} tone={isHost ? 'accent' : 'default'} />
            <Chip label={t('watchTogether.participants', { count: participants.length })} />
          </View>
          {error ? (
            <AppText variant="xs" tone="danger">
              {t('watchTogether.errors.prefix')} {error.message}
            </AppText>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Card style={styles.card}>
            <AppText variant="sm" weight="700">
              {t('watchTogether.participants', { count: participants.length })}
            </AppText>
            {participants.map((participant) => (
              <View key={participant.id} style={styles.participantRow}>
                <Ionicons
                  name={participant.role === 'host' ? 'star' : 'person-outline'}
                  size={14}
                  color={participant.role === 'host' ? theme.colors.accent : theme.colors.textMuted}
                />
                <AppText variant="sm">{participant.displayName}</AppText>
                {participant.id === snapshot?.selfId ? <Chip label={t('watchTogether.you')} /> : null}
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <AppText variant="sm" weight="700">
              {t('watchTogether.playback')}
            </AppText>
            <View style={styles.chipRow}>
              <Chip label={snapshot?.playback.isPlaying ? t('player.playing') : t('player.paused')} />
              <Chip label={`${Math.floor(playbackPosition)} ${t('common.secondsShort')}`} />
              <Chip label={`${snapshot?.playback.rate ?? 1}x`} />
              <Chip label={`${t('common.episode')} ${snapshot?.playback.episodeOrdinal ?? 1}`} />
            </View>
            <Button label={t('watchTogether.openPlayer')} variant="secondary" onPress={openSyncedPlayer} testID="open-synced-player" />
            {isHost ? (
              <View style={styles.hostRow}>
                <Button size="sm" label={t('player.play')} onPress={() => clientRef.current?.sendPlay(playbackPosition)} testID="room-play" />
                <Button size="sm" variant="secondary" label={t('player.pause')} onPress={() => clientRef.current?.sendPause(playbackPosition)} testID="room-pause" />
                <Button size="sm" variant="ghost" label={t('player.forward', { seconds: 10 })} onPress={() => clientRef.current?.sendSeek(playbackPosition + 10)} testID="room-seek" />
              </View>
            ) : (
              <AppText variant="xs" tone="muted">
                {t('watchTogether.hostOnly')}
              </AppText>
            )}
            <AppText variant="xs" tone="muted">
              {t('watchTogether.localPlayback')}
            </AppText>
          </Card>

          <Card style={styles.card}>
            <AppText variant="sm" weight="700">
              {t('watchTogether.chat')}
            </AppText>
            <View style={styles.chatList}>
              {messages.slice(-30).map((message) => (
                <View key={message.id + message.sentAt} style={styles.chatRow}>
                  <AppText variant="xs" weight="700" tone="primary">
                    {message.authorName}
                  </AppText>
                  <AppText variant="sm">{message.text}</AppText>
                </View>
              ))}
              {messages.length === 0 ? (
                <AppText variant="xs" tone="muted">
                  {t('watchTogether.chatEmpty')}
                </AppText>
              ) : null}
            </View>
            <View style={styles.chatInputRow}>
              <TextInput
                value={chatDraft}
                onChangeText={setChatDraft}
                placeholder={t('watchTogether.chatPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                onSubmitEditing={sendChat}
                maxLength={500}
                style={[styles.chatInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}
                testID="room-chat-input"
              />
              <Button label={t('common.send')} size="sm" onPress={sendChat} testID="room-chat-send" />
            </View>
          </Card>

          <Button
            label={t('watchTogether.leave')}
            variant="danger"
            onPress={() => {
              clientRef.current?.disconnect();
              navigation.goBack();
            }}
            testID="leave-room"
          />

          {!title && params.titleId ? (
            <AppText variant="xs" tone="muted">
              {t('watchTogether.needTitle')}
            </AppText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  body: { padding: 16, gap: 14, paddingBottom: 80 },
  card: { gap: 10 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hostRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chatList: { gap: 8, maxHeight: 240 },
  chatRow: { gap: 2 },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
});
