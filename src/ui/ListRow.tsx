import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export interface ListRowProps {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}

export function ListRow({ label, description, icon, right, onPress, testID }: ListRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed && onPress ? 0.85 : 1 }]}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.md },
          ]}
        >
          <Ionicons name={icon} size={16} color={theme.colors.primary} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <AppText variant="md" weight="600">
          {label}
        </AppText>
        {description ? (
          <AppText variant="xs" tone="muted" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  description: { marginTop: 2 },
});
