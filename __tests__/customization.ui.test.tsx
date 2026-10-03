import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TextProvider } from '@/i18n/useText';
import { AppShell } from '@/navigation/AppShell';
import { ThemedTabBar } from '@/navigation/TabBar';
import { PosterCard } from '@/ui/PosterCard';
import { EffectsLayer } from '@/ui/EffectsLayer';
import { CustomizationScreen } from '@/features/settings/CustomizationScreen';
import { EffectsScreen } from '@/features/settings/EffectsScreen';
import { BackgroundStudioScreen } from '@/features/settings/BackgroundStudioScreen';
import { ThemeStudioScreen } from '@/features/settings/ThemeStudioScreen';
import { customizationActions, customizationStore } from '@/store/customizationStore';
import { resolveEffects, type EffectLevels } from '@/theme/effects';
import { CARD_STYLES, type CardStyleId } from '@/theme/cardStyles';
import { NAV_STYLES, type NavStyleId } from '@/theme/navStyles';
import { useSettingsStore } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { METRICS } from './helpers/playbackHarness';

const PRESETS = ['minimalist', 'tokyoGhoul', 'glitchcore', 'cyberpunk', 'y2k', 'darkGothic', 'grunge', 'animeNeon'];

async function wrap(children: React.ReactNode, options: { preset?: string; mode?: 'light' | 'dark'; customization?: object } = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider
        presetId={options.preset ?? 'glitchcore'}
        mode={options.mode ?? 'dark'}
        customization={options.customization}
      >
        <TextProvider language={useSettingsStore.getState().language} overrides={useTextStore.getState().overrides}>
          <NavigationContainer>
            <AppShell>{children}</AppShell>
          </NavigationContainer>
        </TextProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  await customizationStore.reset();
});

describe('customization UI', () => {
  it('renders the customization screens under every new preset', async () => {
    for (const preset of PRESETS) {
      for (const Screen of [CustomizationScreen, EffectsScreen, BackgroundStudioScreen, ThemeStudioScreen]) {
        const view = await wrap(<Screen />, { preset });
        expect(view.toJSON()).toBeTruthy();
        await view.unmount();
      }
    }
  });

  it('renders a poster card for every card style', async () => {
    for (const style of CARD_STYLES) {
      const { getByTestId, unmount } = await wrap(
        <PosterCard
          testID="poster-card"
          title="Токийский Гуль"
          subtitle="2014 · TV"
          poster="https://example.invalid/p.jpg"
          badge="12"
          progressRatio={0.4}
        />,
        { preset: 'tokyoGhoul', customization: { cardStyleId: style.id } },
      );
      expect(getByTestId('poster-card')).toBeTruthy();
      await unmount();
    }
  });

  it('renders the tab bar for every navigation style, including the vertical rail', async () => {
    const Tabs = createBottomTabNavigator();
    const Placeholder = () => <View />;
    for (const style of NAV_STYLES) {
      const { getByTestId, unmount } = await wrap(
        <Tabs.Navigator tabBar={(props) => <ThemedTabBar {...props} />}>
          <Tabs.Screen name="Home" component={Placeholder} />
          <Tabs.Screen name="Search" component={Placeholder} />
        </Tabs.Navigator>,
        { preset: 'cyberpunk', customization: { navStyleId: style.id } },
      );
      expect(getByTestId('tab-bar')).toBeTruthy();
      expect(getByTestId('nav-Home')).toBeTruthy();
      await unmount();
    }
  });

  it('draws nothing when every effect is off', async () => {
    const { queryByTestId } = await wrap(<EffectsLayer />, {
      preset: 'minimalist',
      customization: { effects: resolveEffects({ presetId: 'minimalist' }) },
    });
    expect(queryByTestId('effects-layer')).toBeNull();
  });

  it('draws the active effects and respects Reduce Motion', async () => {
    const levels: EffectLevels = { glitch: 'extreme', scanlines: 'high', particles: 'medium' };
    const { getByTestId, unmount } = await wrap(<EffectsLayer />, {
      preset: 'glitchcore',
      customization: { effects: resolveEffects({ presetId: 'glitchcore', performanceMode: 'high', levels }) },
    });
    expect(getByTestId('effects-layer')).toBeTruthy();
    await unmount();

    const reduced = await wrap(<EffectsLayer />, {
      preset: 'glitchcore',
      customization: {
        effects: resolveEffects({
          presetId: 'glitchcore',
          performanceMode: 'high',
          levels,
          accessibility: { reduceMotion: true, disableFlashing: true },
        }),
      },
    });
    const resolved = resolveEffects({
      presetId: 'glitchcore',
      performanceMode: 'high',
      levels,
      accessibility: { reduceMotion: true, disableFlashing: true },
    });
    expect(resolved.glitch.enabled).toBe(false);
    expect(resolved.particles.animated).toBe(false);
    await reduced.unmount();
  });

  it('switches card and navigation styles instantly from the store', async () => {
    customizationActions.setCardStyleId('polaroid');
    customizationActions.setNavStyleId('icons');
    await customizationStore.flush();
    const state = customizationStore.store.getState();
    expect(state.cardStyleId).toBe<CardStyleId>('polaroid');
    expect(state.navStyleId).toBe<NavStyleId>('icons');
  });
});
