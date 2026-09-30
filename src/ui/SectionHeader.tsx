import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  subtitle,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <AppText
          variant="lg"
          weight="700"
          display
          style={{ textTransform: theme.typography.uppercaseTitles ? 'uppercase' : 'none' }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="xs" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <AppText variant="sm" weight="600" tone="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  textWrap: { flex: 1, gap: 2 },
});
