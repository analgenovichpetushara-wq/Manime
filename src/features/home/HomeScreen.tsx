import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '@/ui/AppText';
import { Card } from '@/ui/Card';
import { PosterCard } from '@/ui/PosterCard';
import { SectionHeader } from '@/ui/SectionHeader';
import { Screen } from '@/ui/Screen';
import { EmptyView, ErrorView, SkeletonRow } from '@/ui/StateViews';
import { Button } from '@/ui/Button';
import { minutesSince } from '@/core/utils/time';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { BannerCarousel } from '@/features/home/BannerCarousel';
import { continueWatchingList, progressActions, recentlyWatchedList, useProgressStore } from '@/store/progressStore';
import { entriesInCategory, useListsStore } from '@/store/listsStore';
import { enabledBanners, useBannersStore } from '@/store/collectionsStores';
import { useSettingsStore } from '@/store/settingsStore';
import { useAchievementsStore } from '@/store/achievementsStore';
import { discoverTitles, fetchSchedule } from '@/services/providerService';
import { EMPTY_FILTERS, type AnimeTitle } from '@/data/models/anime';
import { useAppShell } from '@/navigation/AppShell';
import type { RootStackParamList } from '@/navigation/types';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';
import { titleFromListEntry, titleFromProgress } from '@/services/titleFactory';

export function HomeScreen() {
  const theme = useTheme();
  const { t } = useText();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openTitle } = useAppShell();

  const progress = useProgressStore();
  const lists = useListsStore();
  const settings = useSettingsStore();
  const bannersState = useBannersStore();
  const achievements = useAchievementsStore();

  const continueWatching = useMemo(() => continueWatchingList(progress, 12), [progress]);
  const recentlyWatched = useMemo(() => recentlyWatchedList(progress, 12), [progress]);
  const favorites = useMemo(() => entriesInCategory(lists, 'favorites').slice(0, 12), [lists]);
  const banners = useMemo(() => enabledBanners(bannersState), [bannersState]);

  const [discover, setDiscover] = useState<AnimeTitle[]>([]);
  const [ongoing, setOngoing] = useState<AnimeTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [discovered, schedule] = await Promise.all([
        discoverTitles({ ...EMPTY_FILTERS }, 1).catch(() => ({ items: [] as AnimeTitle[], page: 1, hasMore: false })),
        fetchSchedule(),
      ]);
      if (discovered.items.length || schedule.length) {
        setDiscover(discovered.items);
        setOngoing(schedule);
      } else {
        // Every provider refused → keep whatever cache returned (never blank).
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred one tick so the first paint is never blocked by the network.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    // Streaks and rolling windows are derived numbers: refresh them on every visit
    // so a break in the run is reflected without replaying watch events.
    progressActions.refreshDerived();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const unlocked = Object.values(achievements.states).filter((state) => state.unlocked).length;

  return (
    <Screen scrollable refreshing={refreshing} onRefresh={onRefresh} testID="home-screen">
      <View style={styles.header}>
        <View>
          <AppText variant="xs" tone="muted">
            {t('app.tagline')}
          </AppText>
          <AppText variant="xxl" weight="800" display>
            {t('app.name')}
          </AppText>
        </View>
        <View style={[styles.streakPill, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.pill }]}>
          <Ionicons name="flame" size={14} color={theme.colors.accent} />
          <AppText variant="sm" weight="700">
            {progress.currentStreak}
          </AppText>
        </View>
      </View>

      {error ? (
        <View style={styles.inlineError}>
          <ErrorView messageKey="errors.provider_unavailable" detail={error} onRetry={load} />
        </View>
      ) : null}

      {banners.length ? <BannerCarousel banners={banners} onAction={(banner) => {
        if (banner.action?.type === 'openTitle' && banner.action.target) {
          const title = discover.find((item) => item.id === banner.action?.target);
          if (title) openTitle(title);
        }
      }} /> : null}

      {continueWatching.length ? (
        <>
          <SectionHeader title={t('home.continueWatching')} actionLabel={t('home.seeAll')} onAction={() => navigation.navigate('Tabs', { screen: 'Lists' })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {continueWatching.map((entry) => (
              <PosterCard
                key={`${entry.titleId}-${entry.episodeId}`}
                title={entry.titleName}
                subtitle={t('lists.episodeOf', { current: entry.episodeOrdinal, name: entry.episodeName ?? '' })}
                poster={entry.poster}
                progressRatio={entry.durationSec ? entry.positionSec / entry.durationSec : 0}
                onPress={() =>
                  navigation.navigate('Player', {
                    title: titleFromProgress(entry),
                    episodeId: entry.episodeId,
                    episodeOrdinal: entry.episodeOrdinal,
                    providerId: entry.providerId,
                  })
                }
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {recentlyWatched.length ? (
        <>
          <SectionHeader title={t('home.recentlyWatched')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {recentlyWatched.map((entry) => (
              <PosterCard
                key={`recent-${entry.titleId}`}
                title={entry.titleName}
                subtitle={t('home.watchedAgo', { minutes: minutesSince(entry.updatedAt) })}
                poster={entry.poster}
                onPress={() =>
                  navigation.navigate('Player', {
                    title: titleFromProgress(entry),
                    episodeId: entry.episodeId,
                    episodeOrdinal: entry.episodeOrdinal,
                    providerId: entry.providerId,
                  })
                }
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {favorites.length ? (
        <>
          <SectionHeader title={t('home.favorites')} actionLabel={t('home.seeAll')} onAction={() => navigation.navigate('Tabs', { screen: 'Lists' })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {favorites.map((entry) => (
              <PosterCard
                key={entry.titleId}
                title={entry.titleName}
                poster={entry.poster}
                subtitle={entry.episodesTotal ? t('details.episodeCount', { count: entry.episodesTotal }) : undefined}
                onPress={() => openTitle(titleFromListEntry(entry))}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title={t('home.discover')} subtitle={settings.amoled ? t('settings.amoled') : undefined} />
      {loading && !discover.length ? (
        <SkeletonRow />
      ) : discover.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {discover.slice(0, 14).map((title) => (
            <PosterCard
              key={title.id}
              title={title.title}
              subtitle={title.year ? String(title.year) : undefined}
              poster={title.poster}
              badge={title.rating ? title.rating.toFixed(1) : undefined}
              onPress={() => openTitle(title)}
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyView
          title={t('home.empty.title')}
          subtitle={t('home.empty.subtitle')}
          icon="tv-outline"
          actionLabel={t('nav.search')}
          onAction={() => navigation.navigate('Tabs', { screen: 'Search' })}
        />
      )}

      {ongoing.length ? (
        <>
          <SectionHeader title={t('home.ongoing')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {ongoing.slice(0, 12).map((title) => (
              <PosterCard key={`ongoing-${title.id}`} title={title.title} poster={title.poster} onPress={() => openTitle(title)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.achievementsCard}>
        <Card>
          <View style={styles.achievementsRow}>
            <Ionicons name="trophy" size={22} color={theme.colors.accent} />
            <View style={styles.flex}>
              <AppText variant="md" weight="700">
                {t('achievements.title')}
              </AppText>
              <AppText variant="xs" tone="muted">
                {t('achievements.completedOf', { unlocked, total: ACHIEVEMENTS.length })}
              </AppText>
            </View>
            <Button label={t('common.next')} size="sm" variant="secondary" onPress={() => navigation.navigate('Achievements')} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  inlineError: { height: 220 },
  row: { paddingHorizontal: 16, gap: 12 },
  achievementsCard: { paddingHorizontal: 16, marginTop: 22 },
  achievementsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
