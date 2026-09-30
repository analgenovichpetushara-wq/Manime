import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  fullWidth,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const height = size === 'sm' ? 34 : size === 'lg' ? 54 : 44;
  const padding = size === 'sm' ? 12 : 18;

  const background =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'accent'
        ? theme.colors.accent
        : variant === 'danger'
          ? theme.colors.danger
          : variant === 'secondary'
            ? theme.colors.surfaceAlt
            : 'transparent';

  const textTone =
    variant === 'primary' || variant === 'accent' || variant === 'danger'
      ? 'inverse'
      : variant === 'ghost'
        ? 'primary'
        : 'default';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.container,
        {
          height,
          paddingHorizontal: padding,
          backgroundColor: background,
          borderRadius: theme.shapes.radius.md,
          borderWidth: variant === 'ghost' || variant === 'secondary' ? theme.shapes.borderWidth : 0,
          borderColor: theme.colors.cardBorder,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderStyle: theme.shapes.borderStyle === 'sharp' ? 'solid' : 'solid',
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : icon}
        <AppText variant={size === 'sm' ? 'sm' : 'md'} weight="600" tone={textTone as 'default'} style={styles.label}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    textAlign: 'center',
  },
});
