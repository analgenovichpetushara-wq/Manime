import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Card } from '@/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import type { AchievementDefinition, AchievementState } from '@/data/models/achievements';

export function AchievementCard({
  definition,
  state,
  testID,
}: {
  definition: AchievementDefinition;
  state: AchievementState;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = useText();
  const ratio = Math.min(1, state.target > 0 ? state.progress / state.target : 0);

  return (
    <Card style={styles.card} testID={testID ?? `achievement-${definition.id}`}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: state.unlocked ? theme.colors.primary : theme.colors.chipBackground,
              borderRadius: theme.shapes.radius.md,
            },
          ]}
        >
          <Ionicons
            name={(state.unlocked ? (definition.icon as keyof typeof Ionicons.glyphMap) : 'lock-closed-outline') as keyof typeof Ionicons.glyphMap}
            size={18}
            color={state.unlocked ? theme.colors.primaryText : theme.colors.textMuted}
          />
        </View>
        <View style={styles.textWrap}>
          <AppText variant="sm" weight="700">
            {t(definition.titleKey)}
          </AppText>
          <AppText variant="xs" tone="muted">
            {t(definition.descriptionKey)}
          </AppText>
          <View style={[styles.bar, { backgroundColor: theme.colors.progressTrack }]}>
            <View
              style={[
                styles.barFill,
                { width: `${ratio * 100}%`, backgroundColor: state.unlocked ? theme.colors.success : theme.colors.progressFill },
              ]}
            />
          </View>
          <AppText variant="xs" tone="muted">
            {Math.min(state.progress, state.target)} / {state.target}
            {state.unlocked && state.unlockedAt ? ` · ${new Date(state.unlockedAt).toLocaleDateString()}` : ''}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12 },
  row: { flexDirection: 'row', gap: 12 },
  iconWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, gap: 4 },
  bar: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 5 },
});
