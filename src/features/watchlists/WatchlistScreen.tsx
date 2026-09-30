import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { PosterCard } from '@/ui/PosterCard';
import { Screen } from '@/ui/Screen';
import { EmptyView } from '@/ui/StateViews';
import { Button } from '@/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppShell } from '@/navigation/AppShell';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { listsActions, useListsStore, type StoredListEntry } from '@/store/listsStore';
import { useProgressStore, progressFor } from '@/store/progressStore';
import { useLibraryStore } from '@/store/collectionsStores';
import { titleFromListEntry } from '@/services/titleFactory';
import { WATCHLIST_CATEGORIES, type WatchlistCategory } from '@/data/models/progress';
import { syncAchievements } from '@/services/achievementService';

type Filter = WatchlistCategory | 'library';

const CATEGORY_ICONS: Record<WatchlistCategory, keyof typeof Ionicons.glyphMap> = {
  watching: 'play-circle-outline',
  planned: 'calendar-outline',
  completed: 'checkmark-done-outline',
  dropped: 'close-circle-outline',
  favorites: 'heart-outline',
};

export function WatchlistScreen() {
  const theme = useTheme();
  const { t } = useText();
  const navigation = useAppNavigation();
  const { openTitle, showToast } = useAppShell();
  const lists = useListsStore();
  const progress = useProgressStore();
  const library = useLibraryStore();
  const [filter, setFilter] = useState<Filter>('watching');

  const entries = useMemo(() => {
    // The library tab shows imported media, not watchlist entries.
    if (filter === 'library') return [];
    return Object.values(lists.entries)
      .filter((entry) => entry.categories.includes(filter))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [lists.entries, filter]);

  const counts = useMemo(() => {
    const map = {} as Record<WatchlistCategory, number>;
    WATCHLIST_CATEGORIES.forEach((category) => {
      map[category] = Object.values(lists.entries).filter((entry) => entry.categories.includes(category)).length;
    });
    return map;
  }, [lists.entries]);

  const renderEntry = (entry: StoredListEntry) => {
    const entryProgress = progressFor(progress, entry.titleId);
    const ratio = entryProgress && entryProgress.durationSec > 0 ? entryProgress.positionSec / entryProgress.durationSec : 0;
    return (
      <View key={entry.titleId} style={styles.item}>
        <PosterCard
          title={entry.titleName}
          subtitle={
            entryProgress && !entryProgress.completed
              ? t('lists.continueAt', { time: Math.round(entryProgress.positionSec / 60) })
              : entry.episodesTotal
                ? t('details.episodeCount', { count: entry.episodesTotal })
                : undefined
          }
          poster={entry.poster}
          width={116}
          progressRatio={ratio > 0 && ratio < 1 ? ratio : undefined}
          onPress={() => openTitle(titleFromListEntry(entry))}
          testID={`list-entry-${entry.titleId}`}
        />
        <View style={styles.itemActions}>
          <Pressable
            accessibilityRole="button"
            testID={`continue-${entry.titleId}`}
            onPress={() =>
              navigation.navigate('Player', {
                title: titleFromListEntry(entry),
                episodeId: entryProgress?.episodeId,
                episodeOrdinal: entryProgress?.episodeOrdinal ?? 1,
                providerId: entryProgress?.providerId ?? entry.providerId,
              })
            }
            style={[styles.smallAction, { backgroundColor: theme.colors.primary, borderRadius: theme.shapes.radius.sm }]}
          >
            <Ionicons name="play" size={13} color={theme.colors.primaryText} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID={`move-${entry.titleId}`}
            onPress={() => {
              const current = filter === 'library' ? entry.categories[0] : filter;
              const next = entry.categories.includes('favorites') && current !== 'favorites' ? 'favorites' : 'planned';
              listsActions.moveTo(entry.titleId, next as WatchlistCategory);
              syncAchievements();
              showToast({ titleKey: 'lists.moved', params: { category: t(`lists.tab.${next}`) }, tone: 'accent' });
            }}
            style={[styles.smallAction, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.sm }]}
          >
            <Ionicons name="swap-horizontal" size={13} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Screen scrollable testID="watchlist-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('lists.title')}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {WATCHLIST_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={`${t(`lists.tab.${category}`)}${counts[category] ? ` · ${counts[category]}` : ''}`}
              selected={filter === category}
              onPress={() => setFilter(category)}
              testID={`list-tab-${category}`}
            />
          ))}
          <Chip
            label={t('settings.library')}
            selected={filter === 'library'}
            onPress={() => setFilter('library')}
            testID="list-tab-library"
          />
        </ScrollView>
      </View>

      {filter === 'library' ? (
        library.assets.length ? (
          <View style={styles.section}>
            <AppText variant="sm" tone="muted">
              {t('library.assetsCount', { count: library.assets.length })}
            </AppText>
            <View style={styles.libraryGrid}>
              {library.assets.slice(0, 12).map((asset) => (
                <Pressable
                  key={asset.id}
                  accessibilityRole="button"
                  testID={`library-thumb-${asset.id}`}
                  onPress={() => navigation.navigate('Library')}
                  style={[styles.libraryTile, { borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.sm }]}
                >
                  <Image source={{ uri: asset.uri }} style={styles.libraryImage} contentFit="cover" transition={120} />
                  {asset.kind === 'gif' ? <Chip label={t('library.gifBadge')} tone="accent" /> : null}
                </Pressable>
              ))}
            </View>
            <Button label={t('library.open')} variant="secondary" onPress={() => navigation.navigate('Library')} />
            <AppText variant="xs" tone="muted">
              {t('library.tapHint')}
            </AppText>
          </View>
        ) : (
          <EmptyView
            title={t('library.empty')}
            subtitle={t('library.emptyHint')}
            icon="images-outline"
            actionLabel={t('library.import')}
            onAction={() => navigation.navigate('Library')}
          />
        )
      ) : entries.length ? (
        <View style={styles.grid}>{entries.map(renderEntry)}</View>
      ) : (
        <EmptyView
          title={t('lists.empty')}
          subtitle={t('empty.continue')}
          icon={CATEGORY_ICONS[filter as WatchlistCategory] ?? 'albums-outline'}
          actionLabel={t('nav.search')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Search' })}
        />
      )}

      <View style={styles.summary}>
        <Card>
          <View style={styles.summaryRow}>
            <Ionicons name="stats-chart" size={18} color={theme.colors.primary} />
            <AppText variant="sm" tone="muted">
              {t('stats.episodesCompleted')}: {progress.stats.episodesCompleted} · {t('stats.titlesCompleted')}: {progress.stats.titlesCompleted}
            </AppText>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  tabs: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16, marginTop: 16 },
  item: { gap: 6 },
  itemActions: { flexDirection: 'row', gap: 6 },
  libraryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  libraryTile: { width: 84, height: 84, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', justifyContent: 'flex-end' },
  libraryImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  smallAction: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  summary: { paddingHorizontal: 16, marginTop: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
