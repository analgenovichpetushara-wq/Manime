import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/Chip';
import { PosterCard } from '@/ui/PosterCard';
import { EmptyView, ErrorView, LoadingView } from '@/ui/StateViews';
import { Card } from '@/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppShell } from '@/navigation/AppShell';
import { EMPTY_FILTERS, type AnimeTitle, type SearchFilters } from '@/data/models/anime';
import { fetchGenres, searchTitles } from '@/services/providerService';
import { SearchFiltersSheet } from '@/features/search/SearchFiltersSheet';
import { debounce } from '@/core/utils/async';
import type { RootStackParamList } from '@/navigation/types';

export function SearchScreen() {
  const theme = useTheme();
  const { t } = useText();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { openTitle } = useAppShell();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ ...EMPTY_FILTERS });
  const [results, setResults] = useState<AnimeTitle[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedProviders, setUsedProviders] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    fetchGenres()
      .then(setGenres)
      .catch(() => setGenres([]));
  }, []);

  const runSearch = useCallback(
    async (nextQuery: string, nextFilters: SearchFilters) => {
      if (!nextQuery.trim() && nextFilters.genres.length === 0 && nextFilters.years.length === 0) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const outcome = await searchTitles({ ...nextFilters, query: nextQuery }, 1);
        setResults(outcome.titles);
        setUsedProviders(outcome.usedProviders);
        setFromCache(outcome.fromCache);
      } catch (caught) {
        setError((caught as Error).message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const debouncedSearch = useMemo(() => debounce((value: string) => void runSearch(value, filters), 420), [runSearch, filters]);

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const activeFilterCount =
    filters.genres.length + filters.years.length + filters.statuses.length + filters.providerIds.length + filters.voiceoverKinds.length + (filters.minEpisodes ? 1 : 0);

  return (
    <Screen testID="search-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('search.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('search.hint')}
        </AppText>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.inputWrap, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.shapes.radius.md, borderColor: theme.colors.cardBorder }]}>
          <Ionicons name="search" size={16} color={theme.colors.textMuted} />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.text }]}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => void runSearch(query, filters)}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={t('common.close')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          testID="open-filters"
          accessibilityRole="button"
          onPress={() => setFiltersVisible(true)}
          style={[styles.filterButton, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.md }]}
        >
          <Ionicons name="options-outline" size={18} color={theme.colors.text} />
          {activeFilterCount ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
              <AppText variant="xs" weight="700" style={{ color: theme.colors.accentText }}>
                {activeFilterCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {fromCache ? (
        <View style={styles.notice}>
          <AppText variant="xs" tone="muted">
            {t('home.offlineNotice')}
          </AppText>
        </View>
      ) : null}

      {loading ? <LoadingView /> : null}

      {!loading && error ? (
        <ErrorView messageKey="errors.provider_unavailable" detail={error} onRetry={() => void runSearch(query, filters)} />
      ) : null}

      {!loading && !error && results.length === 0 ? (
        <EmptyView
          title={query ? t('search.empty.title') : t('search.title')}
          subtitle={query ? t('search.empty.subtitle') : t('search.hint')}
          icon="search-outline"
        />
      ) : null}

      {!loading && results.length > 0 ? (
        <>
          <View style={styles.meta}>
            <AppText variant="xs" tone="muted">
              {t('search.results')}: {results.length}
            </AppText>
            {usedProviders.length ? (
              <View style={styles.providerChips}>
                {usedProviders.map((id) => (
                  <Chip key={id} label={id} />
                ))}
              </View>
            ) : null}
          </View>
          <View style={styles.grid}>
            {results.map((title) => (
              <PosterCard
                key={title.id}
                testID={`search-result-${title.id}`}
                title={title.title}
                subtitle={title.year ? `${title.year}` : undefined}
                poster={title.poster}
                badge={title.episodesTotal ? String(title.episodesTotal) : undefined}
                width={110}
                onPress={() => openTitle(title)}
              />
            ))}
          </View>
          {usedProviders.length > 1 ? (
            <Card style={styles.infoCard}>
              <AppText variant="xs" tone="muted">
                {t('search.providersUsed')}: {usedProviders.join(', ')}
              </AppText>
            </Card>
          ) : null}
        </>
      ) : null}

      <SearchFiltersSheet
        visible={filtersVisible}
        filters={filters}
        genres={genres}
        onClose={() => setFiltersVisible(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersVisible(false);
          void runSearch(query, next);
        }}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.colors.primary, borderRadius: theme.shapes.radius.pill }]}
        onPress={() => navigation.navigate('WatchTogether')}
        accessibilityRole="button"
        testID="search-watch-together"
      >
        <Ionicons name="people" size={18} color={theme.colors.primaryText} />
        <AppText variant="sm" weight="700" style={{ color: theme.colors.primaryText }}>
          {t('watchTogether.title')}
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 2 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notice: { paddingHorizontal: 16, marginTop: 10 },
  meta: { paddingHorizontal: 16, marginTop: 16, gap: 6 },
  providerChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 16, marginTop: 12 },
  infoCard: { marginHorizontal: 16, marginTop: 16 },
  fab: { position: 'absolute', bottom: 24, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
});
