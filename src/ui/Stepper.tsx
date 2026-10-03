import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/Chip';
import { useTheme } from '@/theme/ThemeProvider';

export interface StepperProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  testID?: string;
}

/** Discrete value picker used by the customization layers (effects, backgrounds). */
export function Stepper<T extends string | number>({ label, value, options, onChange, testID }: StepperProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} testID={testID}>
      <AppText variant="xs" tone="muted">
        {label}
      </AppText>
      <View style={[styles.row, { borderColor: theme.colors.cardBorder }]}>
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
            testID={`${testID ?? label}-${String(option.value)}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
