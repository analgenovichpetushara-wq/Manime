import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { useText } from '@/i18n/useText';
import { cacheStats, clearCaches, pruneCaches } from '@/services/cacheService';
import { titleCache } from '@/services/titleCache';
import { useAppShell } from '@/navigation/AppShell';
import { formatBytes } from '@/core/utils/format';

/** Cache overview with real entry counts and explicit invalidation. */
export function CacheScreen() {
  const { t } = useText();
  const { showToast } = useAppShell();
  const [stats, setStats] = useState({ titles: 0, auxiliary: 0 });
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setStats(await cacheStats());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <Screen scrollable testID="cache-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('cache.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('cache.subtitle')}
        </AppText>
      </View>

      <Card style={styles.card}>
        <View style={styles.row}>
          <AppText variant="sm" weight="600">
            {t('cache.titles')}
          </AppText>
          <AppText variant="sm" tone="muted">
            {stats.titles}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="sm" weight="600">
            {t('cache.auxiliary')}
          </AppText>
          <AppText variant="sm" tone="muted">
            {stats.auxiliary}
          </AppText>
        </View>
        <AppText variant="xs" tone="muted">
          {t('cache.hint')}
        </AppText>
      </Card>

      <View style={styles.actions}>
        <Button
          label={t('cache.prune')}
          variant="secondary"
          loading={working}
          testID="cache-prune"
          onPress={async () => {
            setWorking(true);
            try {
              const removed = await pruneCaches();
              await titleCache.prune();
              await refresh();
              showToast({ titleKey: 'cache.pruned', params: { count: removed }, tone: 'accent' });
            } finally {
              setWorking(false);
            }
          }}
        />
        <Button
          label={t('cache.clear')}
          variant="danger"
          loading={working}
          testID="cache-clear"
          onPress={async () => {
            setWorking(true);
            try {
              await clearCaches();
              await refresh();
              showToast({ titleKey: 'cache.cleared', tone: 'accent' });
            } finally {
              setWorking(false);
            }
          }}
        />
      </View>

      <Card style={styles.note}>
        <AppText variant="xs" tone="muted">
          {t('cache.safeNote', { bytes: formatBytes(stats.titles * 2048) })}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  card: { marginHorizontal: 16, marginTop: 16, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  note: { marginHorizontal: 16, marginTop: 16 },
});
