import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme/ThemeProvider';
import { BackgroundLayer } from '@/ui/BackgroundLayer';
import { EffectsLayer } from '@/ui/EffectsLayer';
import type { BackgroundScreen } from '@/theme/backgrounds';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Enables the per-screen background configuration for this screen. */
  screenId?: BackgroundScreen;
  /** Heavy effects (particles, distortion) are skipped inside the player. */
  minimalEffects?: boolean;
  testID?: string;
}

export function Screen({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  edges = ['top'],
  style,
  contentStyle,
  screenId,
  minimalEffects = false,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const background = { backgroundColor: theme.colors.background };

  return (
    <SafeAreaView edges={edges} style={[styles.safe, background, style]} testID={testID}>
      <BackgroundLayer screen={screenId} />
      <EffectsLayer minimal={minimalEffects} />
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingBottom: 32 },
});
