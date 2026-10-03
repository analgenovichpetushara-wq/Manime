import React, { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { TextProvider } from '@/i18n/useText';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator, useNavigationTheme } from '@/navigation/RootNavigator';
import { AppShell, useAchievementAnnouncer } from '@/navigation/AppShell';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { LoadingView } from '@/ui/StateViews';
import { hydrateAllPersistedStores, flushAllPersistedStores } from '@/store/persistentStore';
import { withTimeout } from '@/core/utils/async';
import { useSettingsStore, settingsActions } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { useThemeStore } from '@/store/themeStore';
import { useCustomizationStore } from '@/store/customizationStore';
import { resolveEffects } from '@/theme/effects';
import { customThemesToPresets } from '@/theme/customThemes';
import { findPreset, THEME_PRESETS } from '@/theme/presets';
import { useAchievementsStore } from '@/store/achievementsStore';
import { syncAchievements } from '@/services/achievementService';
import { applySettingsToManager, searchTitles } from '@/services/providerService';
import { migrateRetiredProviders } from '@/services/providerMigration';
import { EMPTY_FILTERS } from '@/data/models/anime';
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
  const navigationTheme = useNavigationTheme();

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
        {/* The container sits above AppShell: the global details dialog and the
            toast host are rendered by AppShell and need a navigation object. */}
        <NavigationContainer theme={navigationTheme}>
          <AppShell>
            <AchievementBridge />
            <RootNavigator />
          </AppShell>
        </NavigationContainer>
      </ErrorBoundary>
    </TextProvider>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const settings = useSettingsStore();
  const themeStore = useThemeStore();
  const customization = useCustomizationStore();

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
      // Local history from removed providers is re-attached (never deleted) on
      // first launch after the migration.
      void migrateRetiredProviders({
        searchTitle: async (titleName) => {
          const outcome = await searchTitles({ ...EMPTY_FILTERS, query: titleName }, 1);
          const match = outcome.titles[0];
          return match ? { titleId: match.id, providerId: match.providerId, refId: match.refId } : undefined;
        },
      });
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

  const customThemes = customization.customThemes;

  const themeProps = useMemo(() => {
    const presets = customThemesToPresets(customThemes);
    const known =
      presets.some((preset) => preset.id === themeStore.presetId) ||
      THEME_PRESETS.some((preset) => preset.id === themeStore.presetId);
    const presetId = known ? themeStore.presetId : (customization.defaultCustomThemeId ?? findPreset(themeStore.presetId).id);
    const accessibility = customization.accessibility;
    const reduceMotion = settings.reduceMotion || accessibility.reduceMotion || !customization.animationsEnabled;
    const activeTheme = presets.find((preset) => preset.id === presetId);
    const largerText = accessibility.largerText ? Math.max(settings.fontScale, 1.2) : settings.fontScale;

    return {
      presetId,
      mode: settings.mode,
      amoled: settings.amoled,
      accentColor: settings.accentColor,
      fontScale: largerText,
      reduceMotion,
      override: themeStore.override,
      customization: {
        customThemes,
        cardStyleId: customization.cardStyleId,
        navStyleId: customization.navStyleId,
        backgrounds: customization.backgrounds,
        effects: resolveEffects({
          presetId: activeTheme?.id ?? presetId,
          levels: customization.effectLevels,
          performanceMode: customization.performanceMode,
          accessibility: {
            reduceMotion,
            disableFlashing: accessibility.disableFlashing,
            highContrast: accessibility.highContrast,
            reducedTransparency: accessibility.reducedTransparency,
            reducedBlur: accessibility.reducedBlur,
          },
        }),
      },
    };
  }, [
    themeStore.presetId,
    themeStore.override,
    settings.mode,
    settings.amoled,
    settings.accentColor,
    settings.fontScale,
    settings.reduceMotion,
    customThemes,
    customization.defaultCustomThemeId,
    customization.cardStyleId,
    customization.navStyleId,
    customization.backgrounds,
    customization.effectLevels,
    customization.performanceMode,
    customization.animationsEnabled,
    customization.accessibility,
  ]);

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
