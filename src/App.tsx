import React, { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { TextProvider } from '@/i18n/useText';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AppShell, useAchievementAnnouncer } from '@/navigation/AppShell';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { LoadingView } from '@/ui/StateViews';
import { hydrateAllPersistedStores, flushAllPersistedStores } from '@/store/persistentStore';
import { withTimeout } from '@/core/utils/async';
import { useSettingsStore, settingsActions } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { useThemeStore } from '@/store/themeStore';
import { useAchievementsStore } from '@/store/achievementsStore';
import { syncAchievements } from '@/services/achievementService';
import { applySettingsToManager } from '@/services/providerService';
import { appLogger } from '@/core/logging/logger';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Bridges real achievement progress into toasts. It re-reads *stored* state
 * after hydration; nothing here fabricates progress.
 */
function AchievementBridge() {
  const announce = useAchievementAnnouncer();

  useEffect(() => {
    const initial = syncAchievements();
    if (initial.length) announce(initial);
    const unsubscribe = useAchievementsStore.subscribe((state, previous) => {
      if (state.pendingUnlocks !== previous.pendingUnlocks && state.pendingUnlocks.length) {
        announce(state.pendingUnlocks);
      }
    });
    return unsubscribe;
  }, [announce]);

  return null;
}

function ThemedApp() {
  const theme = useTheme();
  const settings = useSettingsStore();
  const themeStore = useThemeStore();
  const textStore = useTextStore();

  /** Keep the persisted settings row in sync with the active preset. */
  useEffect(() => {
    if (themeStore.presetId && themeStore.presetId !== settings.themePresetId) {
      settingsActions.setThemePreset(themeStore.presetId);
    }
  }, [themeStore.presetId, settings.themePresetId]);

  useEffect(() => {
    applySettingsToManager();
  }, [settings.disabledProviderIds, settings.providerPreferences]);

  const language = settings.language;
  const overrides = textStore.overrides;

  return (
    <TextProvider language={language} overrides={overrides}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} animated />
      <ErrorBoundary>
        <AppShell>
          <AchievementBridge />
          <RootNavigator />
        </AppShell>
      </ErrorBoundary>
    </TextProvider>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const settings = useSettingsStore();
  const themeStore = useThemeStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await withTimeout(
          hydrateAllPersistedStores(),
          8000,
          () => appLogger.warn('hydration timed out; continuing with defaults'),
        );
      } catch (error) {
        // A corrupted snapshot must never block startup: defaults take over.
        appLogger.error('hydration failed', { error: String(error) });
      }
      applySettingsToManager();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void flushAllPersistedStores();
    });
    return () => subscription.remove();
  }, [ready]);

  const themeProps = useMemo(
    () => ({
      presetId: themeStore.presetId,
      mode: settings.mode,
      amoled: settings.amoled,
      accentColor: settings.accentColor,
      fontScale: settings.fontScale,
      reduceMotion: settings.reduceMotion,
      override: themeStore.override,
    }),
    [themeStore.presetId, themeStore.override, settings.mode, settings.amoled, settings.accentColor, settings.fontScale, settings.reduceMotion],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {ready ? (
          <ThemeProvider {...themeProps}>
            <ThemedApp />
          </ThemeProvider>
        ) : (
          <View style={[styles.root, styles.boot]}>
            <LoadingView />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#08080c' },
});
