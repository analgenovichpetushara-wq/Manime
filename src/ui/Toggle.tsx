import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
  accessibilityLabel?: string;
}

export function Toggle({ value, onChange, testID, accessibilityLabel }: ToggleProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? theme.colors.primary : theme.colors.progressTrack,
          borderRadius: theme.shapes.radius.pill,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: value ? theme.colors.textInverse : theme.colors.surface,
            transform: [{ translateX: value ? 18 : 2 }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10 },
});
