import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ModalSheet } from '@/ui/ModalSheet';
import { Chip } from '@/ui/Chip';
import { Button } from '@/ui/Button';
import { AppText } from '@/ui/AppText';
import { useText } from '@/i18n/useText';
import { availableProviders } from '@/services/providerService';
import type { AnimeStatus, SearchFilters, VoiceoverKind } from '@/data/models/anime';

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2018, 2015, 2010];
const STATUSES: AnimeStatus[] = ['ongoing', 'released', 'announced'];
const VOICEOVER_KINDS: VoiceoverKind[] = ['voice', 'dub', 'subtitles', 'raw'];
const MIN_EPISODES = [0, 6, 12, 24, 50, 100];

interface SearchFiltersSheetProps {
  visible: boolean;
  filters: SearchFilters;
  genres: string[];
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}

/**
 * Filters sheet. The body is keyed by the open/closed flag, so every opening
 * starts from the currently applied filters without syncing state in an effect.
 */
export function SearchFiltersSheet(props: SearchFiltersSheetProps) {
  return <FiltersSheetBody key={props.visible ? 'open' : 'closed'} {...props} />;
}

function FiltersSheetBody({ visible, filters, genres, onClose, onApply }: SearchFiltersSheetProps) {
  const { t } = useText();
  const [draft, setDraft] = useState<SearchFilters>(filters);

  const toggle = <K extends 'genres' | 'years' | 'statuses' | 'providerIds' | 'voiceoverKinds'>(
    key: K,
    value: SearchFilters[K][number],
  ) => {
    setDraft((current) => {
      const list = current[key] as (typeof value)[];
      const exists = list.includes(value);
      const next = exists ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [key]: next } as SearchFilters;
    });
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('search.filters')} presentation="sheet" testID="filters-sheet">
      <View style={styles.group}>
        <AppText variant="sm" weight="700">
          {t('common.genres')}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {genres.slice(0, 40).map((genre) => (
            <Chip key={genre} label={genre} selected={draft.genres.includes(genre)} onPress={() => toggle('genres', genre)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.group}>
        <AppText variant="sm" weight="700">
          {t('common.year')}
        </AppText>
        <View style={styles.wrapChips}>
          {YEARS.map((year) => (
            <Chip key={year} label={String(year)} selected={draft.years.includes(year)} onPress={() => toggle('years', year)} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="sm" weight="700">
          {t('search.filter.status')}
        </AppText>
        <View style={styles.wrapChips}>
          {STATUSES.map((status) => (
            <Chip
              key={status}
              label={t(`status.${status}`)}
              selected={draft.statuses.includes(status)}
              onPress={() => toggle('statuses', status)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="sm" weight="700">
          {t('common.providers')}
        </AppText>
        <View style={styles.wrapChips}>
          {availableProviders().map((provider) => (
            <Chip
              key={provider.id}
              label={provider.name}
              selected={draft.providerIds.includes(provider.id)}
              onPress={() => toggle('providerIds', provider.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="sm" weight="700">
          {t('search.filter.voiceover')}
        </AppText>
        <View style={styles.wrapChips}>
          {VOICEOVER_KINDS.map((kind) => (
            <Chip
              key={kind}
              label={t(`voiceover.${kind}`)}
              selected={draft.voiceoverKinds.includes(kind)}
              onPress={() => toggle('voiceoverKinds', kind)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="sm" weight="700">
          {t('search.minEpisodes')}
        </AppText>
        <View style={styles.wrapChips}>
          {MIN_EPISODES.map((count) => (
            <Chip
              key={count}
              label={count === 0 ? t('common.all') : String(count)}
              selected={(draft.minEpisodes ?? 0) === count}
              onPress={() => setDraft((current) => ({ ...current, minEpisodes: count === 0 ? undefined : count }))}
            />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button label={t('search.resetFilters')} variant="secondary" onPress={() => setDraft({ ...filters, genres: [], years: [], statuses: [], providerIds: [], voiceoverKinds: [], minEpisodes: undefined })} />
        <Button label={t('search.apply')} onPress={() => onApply(draft)} />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  chips: { gap: 8, paddingRight: 8 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
});
