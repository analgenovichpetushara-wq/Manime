import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { BackgroundLayer } from '@/ui/BackgroundLayer';
import type { BackgroundScreen } from '@/theme/backgrounds';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  testID?: string;
  /** Full-height floating dialog (anime details) vs. bottom sheet (picker). */
  presentation?: 'dialog' | 'sheet';
  /** Renders the configured per-screen background inside the dialog. */
  backgroundScreen?: BackgroundScreen;
}

/**
 * Animated floating modal used everywhere in the app:
 * fade + scale in, dimmed backdrop, rounded corners, explicit close button.
 */
export function ModalSheet({
  visible,
  onClose,
  title,
  children,
  scrollable = true,
  testID = 'modal-sheet',
  presentation = 'dialog',
  backgroundScreen,
}: ModalSheetProps) {
  const theme = useTheme();
  const { t } = useText();
  const { height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const reduce = theme.reduceMotion;
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduce ? 0 : visible ? 240 : 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress, theme.reduceMotion]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: presentation === 'sheet' ? [40, 0] : [16, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { backgroundColor: theme.presentation.dimBackground, opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} testID={`${testID}-backdrop`} />
      </Animated.View>
      <View style={[styles.wrapper, presentation === 'sheet' ? styles.wrapperBottom : styles.wrapperCenter]} pointerEvents="box-none">
        <Animated.View
          testID={testID}
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.shapes.radius.lg,
              borderColor: theme.colors.cardBorder,
              borderWidth: theme.shapes.borderWidth,
              maxHeight: height * (presentation === 'sheet' ? 0.72 : 0.86),
              width: presentation === 'sheet' ? '100%' : '92%',
              opacity: progress,
              transform: [{ scale }, { translateY }],
            },
          ]}
        >
          {backgroundScreen ? <BackgroundLayer screen={backgroundScreen} /> : null}
          <View style={styles.header}>
            <AppText variant="lg" weight="700" display numberOfLines={1} style={styles.headerTitle}>
              {title ?? ''}
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              testID={`${testID}-close`}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.pill }]}
            >
              <Ionicons name="close" size={18} color={theme.colors.text} />
            </Pressable>
          </View>
          {scrollable ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  wrapper: { flex: 1 },
  wrapperCenter: { alignItems: 'center', justifyContent: 'center' },
  wrapperBottom: { justifyContent: 'flex-end' },
  container: { overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  headerTitle: { flex: 1, marginRight: 12 },
  closeButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 4, gap: 12 },
});
