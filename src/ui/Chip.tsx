import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'primary' | 'accent';
  testID?: string;
}

export function Chip({ label, selected, onPress, tone = 'default', testID }: ChipProps) {
  const theme = useTheme();
  const background = selected
    ? tone === 'accent'
      ? theme.colors.accent
      : theme.colors.primary
    : theme.colors.chipBackground;
  const color = selected ? theme.colors.textInverse : theme.colors.chipText;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: background,
          borderRadius: theme.presentation.navStyle === 'pill' ? theme.shapes.radius.pill : theme.shapes.radius.md,
          borderWidth: selected ? 0 : theme.presentation.cardStyle === 'outlined' ? theme.shapes.borderWidth : 0,
          borderColor: theme.colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <AppText variant="sm" weight="600" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
