import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';

export interface ToastMessage {
  id: string;
  titleKey: string;
  params?: Record<string, string | number>;
  tone?: 'default' | 'accent' | 'danger';
}

export function ToastHost({ messages }: { messages: ToastMessage[] }) {
  const theme = useTheme();
  const { t } = useText();
  if (!messages.length) return null;

  return (
    <View pointerEvents="none" style={styles.host} testID="toast-host">
      {messages.map((message) => (
        <Animated.View
          key={message.id}
          entering={undefined}
          style={[
            styles.toast,
            {
              backgroundColor: theme.colors.surface,
              borderColor:
                message.tone === 'danger' ? theme.colors.danger : message.tone === 'accent' ? theme.colors.accent : theme.colors.cardBorder,
              borderRadius: theme.shapes.radius.md,
              borderWidth: theme.shapes.borderWidth,
            },
          ]}
        >
          <AppText variant="sm" weight="600">
            {t(message.titleKey, message.params)}
          </AppText>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', bottom: 92, left: 16, right: 16, gap: 8 },
  toast: { paddingHorizontal: 14, paddingVertical: 10 },
});
