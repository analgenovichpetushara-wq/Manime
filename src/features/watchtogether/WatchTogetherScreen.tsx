import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { createRoomId } from '@/features/watchtogether/sync/client';
import { watchTogetherActions, useWatchTogetherStore } from '@/store/watchTogetherStore';
import { useSettingsStore } from '@/store/settingsStore';
import { env } from '@/core/config/env';

export function WatchTogetherScreen() {
  const theme = useTheme();
  const { t } = useText();
  const navigation = useAppNavigation();
  const store = useWatchTogetherStore();
  const settings = useSettingsStore();
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState(store.displayName ?? settings.watchTogetherDisplayName ?? '');
  const serverConfigured = Boolean(env.watchTogetherUrl);
  const [reachable, setReachable] = useState<'unknown' | 'ok' | 'down'>(serverConfigured ? 'unknown' : 'down');
  const [checking, setChecking] = useState(serverConfigured);

  /** Probes the sync node health endpoint; never throws, a dead node is a state, not an error. */
  const checkServer = useCallback(async () => {
    if (!serverConfigured) return;
    try {
      await Promise.resolve();
      const httpUrl = env.watchTogetherUrl.replace(/^ws/, 'http').replace(/\/$/, '');
      const response = await fetch(`${httpUrl}/health`);
      const payload = (await response.json()) as { ok?: boolean };
      setReachable(payload?.ok ? 'ok' : 'down');
    } catch {
      setReachable('down');
    } finally {
      setChecking(false);
    }
  }, [serverConfigured]);

  useEffect(() => {
    // Deferred one tick: the health probe must never delay mounting the screen.
    const timer = setTimeout(() => void checkServer(), 0);
    return () => clearTimeout(timer);
  }, [checkServer]);

  const recheck = useCallback(() => {
    setChecking(true);
    void checkServer();
  }, [checkServer]);

  const persistName = (value: string) => {
    setDisplayName(value);
    watchTogetherActions.setDisplayName(value);
  };

  return (
    <Screen scrollable screenId="watchTogether" testID="watch-together-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('watchTogether.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('watchTogether.subtitle')}
        </AppText>
      </View>

      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <Ionicons
            name={reachable === 'ok' ? 'cloud-done-outline' : reachable === 'down' ? 'cloud-offline-outline' : 'cloud-outline'}
            size={16}
            color={reachable === 'ok' ? theme.colors.success : theme.colors.textMuted}
          />
          <AppText variant="xs" tone="muted">
            {serverConfigured ? (reachable === 'ok' ? t('watchTogether.serverOk') : t('watchTogether.serverDown')) : t('watchTogether.serverMissing')}
          </AppText>
          {serverConfigured ? <Button size="sm" variant="ghost" label={t('common.retry')} loading={checking} onPress={recheck} /> : null}
        </View>
        {!serverConfigured ? (
          <AppText variant="xs" tone="muted">
            {t('watchTogether.serverHint')}
          </AppText>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('watchTogether.yourName')}
        </AppText>
        <TextInput
          value={displayName}
          onChangeText={persistName}
          placeholder={t('watchTogether.guest')}
          placeholderTextColor={theme.colors.textMuted}
          maxLength={32}
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}
          testID="watch-together-name"
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('watchTogether.create')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('watchTogether.createHint')}
        </AppText>
        <Button
          label={t('watchTogether.create')}
          disabled={!serverConfigured}
          onPress={() => {
            navigation.navigate('Room', { roomId: createRoomId(), code: '', isHost: true });
          }}
          testID="create-room"
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('watchTogether.join')}
        </AppText>
        <View style={styles.joinRow}>
          <TextInput
            value={roomCode}
            onChangeText={(value) => setRoomCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder={t('watchTogether.codePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            maxLength={6}
            style={[styles.input, styles.codeInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}
            testID="room-code-input"
          />
          <Button
            label={t('watchTogether.enter')}
            disabled={!serverConfigured || roomCode.length < 4}
            onPress={() => navigation.navigate('Room', { roomId: roomCode, code: roomCode, isHost: false })}
            testID="join-room"
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('watchTogether.localPlayback')}
        </AppText>
        <Button
          label={t('watchTogether.copyServer')}
          variant="ghost"
          size="sm"
          onPress={async () => {
            await Clipboard.setStringAsync(env.watchTogetherUrl || 'ws://<host>:8787');
          }}
        />
      </Card>

      {store.history.length ? (
        <Card style={styles.card}>
          <AppText variant="sm" weight="700">
            {t('watchTogether.recent')}
          </AppText>
          <ScrollView style={styles.history} contentContainerStyle={styles.historyContent}>
            {[...store.history].reverse().slice(0, 6).map((entry) => (
              <View key={`${entry.roomId}-${entry.joinedAt}`} style={styles.historyRow}>
                <AppText variant="sm" weight="700">
                  {entry.code}
                </AppText>
                <AppText variant="xs" tone="muted">
                  {entry.role === 'host' ? t('watchTogether.host') : t('watchTogether.guest')}
                </AppText>
                <Button
                  size="sm"
                  variant="ghost"
                  label={t('common.open')}
                  onPress={() => navigation.navigate('Room', { roomId: entry.roomId, code: entry.code, isHost: entry.role === 'host' })}
                />
              </View>
            ))}
          </ScrollView>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  card: { marginHorizontal: 16, marginTop: 14, gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  codeInput: { flex: 1, letterSpacing: 3, fontWeight: '700' },
  history: { maxHeight: 200 },
  historyContent: { gap: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
