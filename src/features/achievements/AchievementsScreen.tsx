import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { AchievementCard } from '@/features/achievements/AchievementCard';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';
import { statesByCategory, totalProgressPercent, unlockedCount } from '@/features/achievements/achievementsEngine';
import { useAchievementsStore } from '@/store/achievementsStore';
import type { AchievementCategory } from '@/data/models/achievements';

const CATEGORY_ORDER: AchievementCategory[] = [
  'start',
  'episodes',
  'hours',
  'streak',
  'genre',
  'provider',
  'voiceover',
  'binge',
  'special',
];

type Filter = 'all' | 'unlocked' | 'locked';

export function AchievementsScreen() {
  const theme = useTheme();
  const { t } = useText();
  const achievements = useAchievementsStore();
  const [filter, setFilter] = useState<Filter>('all');

  const grouped = useMemo(() => statesByCategory(achievements.states), [achievements.states]);
  const unlocked = unlockedCount(achievements.states);
  const percent = totalProgressPercent(achievements.states);

  return (
    <Screen scrollable screenId="achievements" testID="achievements-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('achievements.title')}
        </AppText>
        <AppText variant="sm" tone="muted">
          {t('achievements.completedOf', { unlocked, total: ACHIEVEMENTS.length })}
        </AppText>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.progressTrack }]}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: theme.colors.progressFill }]} />
        </View>
        <AppText variant="xs" tone="muted">
          {t('achievements.derivedNotice')}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', 'unlocked', 'locked'] as Filter[]).map((value) => (
            <Chip
              key={value}
              label={value === 'all' ? t('common.all') : value === 'unlocked' ? t('achievements.unlocked') : t('achievements.locked')}
              selected={filter === value}
              onPress={() => setFilter(value)}
              testID={`achievement-filter-${value}`}
            />
          ))}
        </ScrollView>
      </View>

      {CATEGORY_ORDER.map((category) => {
        const items = (grouped[category] ?? []).filter(({ state }) =>
          filter === 'all' ? true : filter === 'unlocked' ? state.unlocked : !state.unlocked,
        );
        if (!items.length) return null;
        return (
          <View key={category} style={styles.section}>
            <AppText variant="lg" weight="700" display style={styles.sectionTitle}>
              {t(`achievements.category.${category}`)}
            </AppText>
            {items.map(({ definition, state }) => (
              <AchievementCard key={definition.id} definition={definition} state={state} />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8 },
  filters: { gap: 8, marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 18, gap: 8 },
  sectionTitle: { marginBottom: 2 },
});
