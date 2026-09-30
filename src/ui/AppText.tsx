import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { scaledFontSize } from '@/theme/themeEngine';

export type TextVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'banner';
export type TextTone = 'default' | 'muted' | 'primary' | 'accent' | 'inverse' | 'danger' | 'success';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  display?: boolean;
  mono?: boolean;
  center?: boolean;
  numberOfLines?: number;
}

export function AppText({
  variant = 'md',
  tone = 'default',
  weight,
  display = false,
  mono = false,
  center = false,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const size = theme.typography.sizes[variant];
  const color = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    accent: theme.colors.accent,
    inverse: theme.colors.textInverse,
    danger: theme.colors.danger,
    success: theme.colors.success,
  }[tone];

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        {
          color,
          fontSize: scaledFontSize(size, theme.fontScale),
          lineHeight: scaledFontSize(size, theme.fontScale) * theme.typography.lineHeightScale,
          letterSpacing: theme.typography.letterSpacing,
          fontFamily: mono ? theme.typography.fontFamilyMono : display ? theme.typography.fontFamilyDisplay : theme.typography.fontFamilyBody,
          fontWeight: weight ?? (display ? '700' : '400'),
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
