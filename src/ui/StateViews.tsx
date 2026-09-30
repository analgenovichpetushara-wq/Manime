import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';

export function LoadingView({ label }: { label?: string }) {
  const theme = useTheme();
  const { t } = useText();
  return (
    <View style={styles.center} testID="loading-view">
      <ActivityIndicator color={theme.colors.primary} />
      <AppText variant="sm" tone="muted" style={styles.gap}>
        {label ?? t('common.loading')}
      </AppText>
    </View>
  );
}

export function EmptyView({
  title,
  subtitle,
  icon = 'sparkles-outline',
  actionLabel,
  onAction,
  testID = 'empty-view',
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.center} testID={testID}>
      <Ionicons
        name={icon}
        size={40}
        color={theme.presentation.iconStyle === 'filled' ? theme.colors.primary : theme.colors.textMuted}
      />
      <AppText variant="lg" weight="700" center style={styles.gap}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="sm" tone="muted" center style={styles.smallGap}>
          {subtitle}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

export function ErrorView({
  messageKey,
  detail,
  onRetry,
  testID = 'error-view',
}: {
  messageKey: string;
  detail?: string;
  onRetry?: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = useText();
  return (
    <View style={styles.center} testID={testID}>
      <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.danger} />
      <AppText variant="md" weight="600" center style={styles.gap}>
        {t(messageKey)}
      </AppText>
      {detail ? (
        <AppText variant="xs" tone="muted" center style={styles.smallGap}>
          {detail}
        </AppText>
      ) : null}
      {onRetry ? <Button label={t('common.retry')} variant="secondary" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

export function SkeletonRow({ height = 180, count = 3 }: { height?: number; count?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.skeletonRow} testID="skeleton-row">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: 124,
            height,
            borderRadius: theme.shapes.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, flex: 1 },
  gap: { marginTop: 12 },
  smallGap: { marginTop: 6 },
  action: { marginTop: 18 },
  skeletonRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
});
