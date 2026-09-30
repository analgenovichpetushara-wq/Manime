import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  testID?: string;
}

export function Card({ children, onPress, style, padded = true, testID }: CardProps) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.colors.card,
    borderRadius: theme.shapes.radius.lg,
    borderWidth: theme.presentation.cardStyle === 'outlined' ? theme.shapes.borderWidth : 0,
    borderColor: theme.colors.cardBorder,
    padding: padded ? 16 : 0,
    ...(theme.presentation.cardStyle === 'elevated'
      ? {
          shadowColor: '#000',
          shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.12,
          shadowRadius: theme.shapes.elevation * 2,
          shadowOffset: { width: 0, height: theme.shapes.elevation },
          elevation: theme.shapes.elevation,
        }
      : {}),
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[base, style]}>
      {children}
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
