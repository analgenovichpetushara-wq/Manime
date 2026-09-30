import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppShell } from '@/navigation/AppShellContext';
import { useAchievementAnnouncer } from '@/navigation/achievementAnnouncer';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { fetchEpisodes, fetchTitle, fetchVoiceovers, describeError } from '@/services/providerService';
import { listsActions, useListsStore } from '@/store/listsStore';
import { progressFor, useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { syncAchievements } from '@/services/achievementService';
import type { AnimeTitle, Episode, Voiceover } from '@/data/models/anime';
import { formatDurationMinutes } from '@/core/utils/time';
import { SkeletonRow } from '@/ui/StateViews';

type Tab = 'overview' | 'episodes';

/**
 * Floating anime dialog: fade + scale animation, dimmed backdrop, rounded
 * corners, sources, voiceovers, episode list, watch and favorite actions.
 *
 * The body is keyed by the title id, so opening another anime remounts it with
 * fresh state instead of mutating stale state from an effect.
 */
export function AnimeDetailsModal() {
  const { activeTitle } = useAppShell();
  return <AnimeDetailsBody key={activeTitle?.id ?? 'none'} activeTitle={activeTitle} />;
}

function AnimeDetailsBody({ activeTitle }: { activeTitle: AnimeTitle | null }) {
  const { closeTitle, showToast } = useAppShell();
  const announce = useAchievementAnnouncer();
  const navigation = useAppNavigation();
  const theme = useTheme();
  const { t } = useText();
  const settings = useSettingsStore();
  const listsState = useListsStore();
  const progressState = useProgressStore();

  const [detail, setDetail] = useState<AnimeTitle | null>(activeTitle);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>([]);
  const [episodesProvider, setEpisodesProvider] = useState<string | null>(null);
  const [selectedVoiceover, setSelectedVoiceover] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(Boolean(activeTitle));
  const [error, setError] = useState<string | null>(null);

  const isFavorite = useMemo(
    () => (detail ? listsState.entries[detail.id]?.categories.includes('favorites') ?? false : false),
    [listsState, detail],
  );

  const progress = detail ? progressFor(progressState, detail.id) : undefined;

  const loadDetails = useCallback(
    async (title: AnimeTitle) => {
      setLoading(true);
      setError(null);
      try {
        const fresh = await fetchTitle(title);
        setDetail(fresh);
        const [episodeOutcome, voiceoverList] = await Promise.all([
          fetchEpisodes(fresh).catch((caught) => {
            setError(describeError(caught).messageKey);
            return { episodes: [] as Episode[], providerId: fresh.providerId, failures: [] };
          }),
          fetchVoiceovers(fresh).catch(() => [] as Voiceover[]),
        ]);
        setEpisodes(episodeOutcome.episodes);
        setEpisodesProvider(episodeOutcome.providerId);
        setVoiceovers(voiceoverList);
        setSelectedVoiceover(voiceoverList.find((item) => item.isDefault)?.id ?? voiceoverList[0]?.id);
      } catch (caught) {
        setError(describeError(caught).messageKey);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!activeTitle) return;
    // Deferred past the commit: opening the dialog must not cascade a render.
    const timer = setTimeout(() => void loadDetails(activeTitle), 0);
    return () => clearTimeout(timer);
  }, [activeTitle, loadDetails]);

  const primaryEpisode = useMemo(() => {
    if (!episodes.length) return undefined;
    const target = progress?.episodeOrdinal ?? 1;
    return episodes.find((episode) => episode.ordinal === target) ?? episodes[0];
  }, [episodes, progress]);

  if (!activeTitle || !detail) return null;

  return (
    <ModalSheet visible={Boolean(activeTitle)} onClose={closeTitle} title={detail.title} testID="details-modal">
      <View style={styles.heroRow}>
        {detail.poster ? (
          <Image
            source={{ uri: detail.poster }}
            style={[styles.poster, { borderRadius: theme.shapes.radius.md, backgroundColor: theme.colors.surfaceAlt }]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.poster, { borderRadius: theme.shapes.radius.md, backgroundColor: theme.colors.surfaceAlt }]} />
        )}
        <View style={styles.heroInfo}>
          {detail.titleEn ? (
            <AppText variant="sm" tone="muted" numberOfLines={2}>
              {detail.titleEn}
            </AppText>
          ) : null}
          <View style={styles.metaRow}>
            <AppText variant="sm" weight="600">
              {t(`type.${detail.type}`)}
            </AppText>
            {detail.year ? (
              <AppText variant="sm" tone="muted">
                · {detail.year}
              </AppText>
            ) : null}
            {detail.ageRating ? (
              <AppText variant="sm" tone="muted">
                · {detail.ageRating}
              </AppText>
            ) : null}
          </View>
          <AppText variant="sm" tone={detail.status === 'ongoing' ? 'primary' : 'muted'}>
            {t(`status.${detail.status}`)}
          </AppText>
          {detail.rating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={theme.colors.accent} />
              <AppText variant="sm" weight="700">
                {detail.rating.toFixed(2)}
              </AppText>
              {detail.ratingVotes ? (
                <AppText variant="xs" tone="muted">
                  ({detail.ratingVotes})
                </AppText>
              ) : null}
            </View>
          ) : null}
          {detail.averageEpisodeDurationSec ? (
            <AppText variant="xs" tone="muted">
              ~{formatDurationMinutes(detail.averageEpisodeDurationSec)} · {t('common.episode')}
            </AppText>
          ) : null}
        </View>
      </View>

      {detail.isMature ? (
        <View style={[styles.matureBadge, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.sm }]}>
          <AppText variant="xs" tone="danger" weight="700">
            {t('details.matureNotice')}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <Button
          label={progress && !progress.completed ? t('details.continue') : t('details.watch')}
          onPress={() => {
            closeTitle();
            navigation.navigate('Player', {
              title: detail,
              episodeId: primaryEpisode?.id,
              episodeOrdinal: primaryEpisode?.ordinal,
              providerId: episodesProvider ?? detail.providerId,
              voiceoverId: selectedVoiceover,
            });
          }}
          disabled={!episodes.length}
          icon={<Ionicons name="play" size={16} color={theme.colors.primaryText} />}
          style={styles.primaryAction}
        />
        <Button
          label={isFavorite ? t('details.inFavorites') : t('details.addToFavorites')}
          variant="secondary"
          icon={<Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={16} color={theme.colors.text} />}
          onPress={() => {
            const nowFavorite = listsActions.toggleFavorite(detail);
            showToast({ titleKey: nowFavorite ? 'details.inFavorites' : 'details.addToFavorites', tone: 'accent' });
            announce(syncAchievements());
          }}
        />
      </View>

      <View style={styles.tabsRow}>
        {(['overview', 'episodes'] as Tab[]).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={styles.tabButton} accessibilityRole="button">
            <AppText variant="sm" weight={tab === item ? '700' : '400'} tone={tab === item ? 'primary' : 'muted'}>
              {item === 'overview' ? t('details.description') : t('details.episodes')}
            </AppText>
            {tab === item ? <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} /> : null}
          </Pressable>
        ))}
      </View>

      {loading ? <SkeletonRow height={56} count={1} /> : null}

      {!loading && tab === 'overview' ? (
        <>
          <AppText variant="sm" tone="default">
            {detail.synopsis || t('details.emptySynopsis')}
          </AppText>
          {detail.genres.length ? (
            <View style={styles.chips}>
              {detail.genres.map((genre) => (
                <Chip key={genre} label={genre} />
              ))}
            </View>
          ) : null}
          {detail.tags.length ? (
            <View style={styles.chips}>
              {detail.tags.map((tag) => (
                <Chip key={tag} label={tag} tone="accent" />
              ))}
            </View>
          ) : null}
          <AppText variant="sm" weight="700" style={styles.sectionTitle}>
            {t('details.sources')}
          </AppText>
          <View style={styles.chips}>
            {detail.providerRefs.map((ref) => (
              <Chip key={`${ref.providerId}-${ref.refId}`} label={ref.providerId} selected={ref.providerId === episodesProvider} />
            ))}
          </View>
          {voiceovers.length ? (
            <>
              <AppText variant="sm" weight="700" style={styles.sectionTitle}>
                {t('details.voiceovers')}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {voiceovers.map((voiceover) => (
                  <Chip
                    key={voiceover.id}
                    label={voiceover.name}
                    selected={selectedVoiceover === voiceover.id}
                    onPress={() => setSelectedVoiceover(voiceover.id)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}

      {!loading && tab === 'episodes' ? (
        episodes.length ? (
          <>
            {episodesProvider ? (
              <AppText variant="xs" tone="muted">
                {t('details.episodesFrom', { provider: episodesProvider })}
              </AppText>
            ) : null}
            <View style={styles.episodeList}>
              {episodes.map((episode) => {
                const active = progress?.episodeId === episode.id;
                return (
                  <Pressable
                    key={episode.id}
                    testID={`episode-${episode.ordinal}`}
                    onPress={() => {
                      closeTitle();
                      navigation.navigate('Player', {
                        title: detail,
                        episodeId: episode.id,
                        episodeOrdinal: episode.ordinal,
                        providerId: episodesProvider ?? detail.providerId,
                        voiceoverId: selectedVoiceover,
                      });
                    }}
                    style={[
                      styles.episodeRow,
                      {
                        backgroundColor: active ? theme.colors.chipBackground : 'transparent',
                        borderRadius: theme.shapes.radius.md,
                      },
                    ]}
                  >
                    <View style={[styles.episodeNumber, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.shapes.radius.sm }]}>
                      <AppText variant="sm" weight="700">
                        {episode.ordinal}
                      </AppText>
                    </View>
                    <View style={styles.episodeText}>
                      <AppText variant="sm" weight={active ? '700' : '500'} numberOfLines={1}>
                        {episode.name ?? t('common.episode') + ' ' + episode.ordinal}
                      </AppText>
                      <AppText variant="xs" tone="muted">
                        {episode.durationSec ? formatDurationMinutes(episode.durationSec) : t('common.unknown')}
                        {episode.introSkip ? ` · ${t('player.skipIntro')}` : ''}
                      </AppText>
                    </View>
                    <Ionicons name="play-circle-outline" size={20} color={theme.colors.primary} />
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <AppText variant="sm" tone="muted">
            {error ? t(error) : t('details.noEpisodes')}
          </AppText>
        )
      ) : null}

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {settings.wifiOnlyStreaming ? (
        <AppText variant="xs" tone="muted">
          {t('settings.wifiOnly')}
        </AppText>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', gap: 14 },
  poster: { width: 108, height: 160 },
  heroInfo: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matureBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  primaryAction: { minWidth: 150 },
  tabsRow: { flexDirection: 'row', gap: 20, marginTop: 6 },
  tabButton: { paddingVertical: 6, alignItems: 'center' },
  tabIndicator: { height: 2, width: '100%', marginTop: 4, borderRadius: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { marginTop: 12 },
  episodeList: { gap: 6 },
  episodeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8 },
  episodeNumber: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  episodeText: { flex: 1, gap: 2 },
});
