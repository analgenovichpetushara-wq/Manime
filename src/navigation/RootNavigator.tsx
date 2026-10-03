import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Theme as NavTheme } from '@react-navigation/native';
import { useTheme, useNavStyle } from '@/theme/ThemeProvider';
import { ThemedTabBar, VERTICAL_RAIL_WIDTH } from '@/navigation/TabBar';
import { useText } from '@/i18n/useText';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { HomeScreen } from '@/features/home/HomeScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { WatchlistScreen } from '@/features/watchlists/WatchlistScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { EmbedPlayerScreen } from '@/features/player/EmbedPlayerScreen';
import { AchievementsScreen } from '@/features/achievements/AchievementsScreen';
import { CustomizationScreen } from '@/features/settings/CustomizationScreen';
import { EffectsScreen } from '@/features/settings/EffectsScreen';
import { BackgroundStudioScreen } from '@/features/settings/BackgroundStudioScreen';
import { ThemeStudioScreen } from '@/features/settings/ThemeStudioScreen';
import { CustomTextScreen } from '@/features/settings/CustomTextScreen';
import { ProvidersScreen } from '@/features/settings/ProvidersScreen';
import { CacheScreen } from '@/features/settings/CacheScreen';
import { BannerStudioScreen } from '@/features/settings/BannerStudioScreen';
import { LibraryScreen } from '@/features/settings/LibraryScreen';
import { DetailsReadmeScreen } from '@/features/settings/DetailsReadmeScreen';
import { WatchTogetherScreen } from '@/features/watchtogether/WatchTogetherScreen';
import { RoomScreen } from '@/features/watchtogether/RoomScreen';

const Tabs = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Vertical navigation renders as a left rail, so the tab content is inset by
 * the rail width instead of being overlapped by it.
 */
function withRailInset(Component: React.ComponentType, inset: number): React.ComponentType {
  const Wrapped = () => (
    <View style={{ flex: 1, paddingLeft: inset }}>
      <Component />
    </View>
  );
  Wrapped.displayName = 'RailInset';
  return Wrapped;
}

function TabNavigator() {
  const theme = useTheme();
  const { t } = useText();
  const nav = useNavStyle();
  const inset = nav.orientation === 'vertical' ? VERTICAL_RAIL_WIDTH + nav.margin : 0;

  const wrap = (Component: React.ComponentType): React.ComponentType =>
    inset > 0 ? withRailInset(Component, inset) : Component;

  return (
    <Tabs.Navigator
      tabBar={(props) => <ThemedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.navActive,
        tabBarInactiveTintColor: theme.colors.navInactive,
        tabBarLabelStyle: {
          fontSize: theme.typography.sizes.xs,
          fontFamily: theme.typography.fontFamilyBody,
          textTransform: theme.presentation.headlineTransform === 'uppercase' ? 'uppercase' : 'none',
        },
      }}
    >
      <Tabs.Screen name="Home" component={wrap(HomeScreen)} options={{ title: t('nav.home') }} />
      <Tabs.Screen name="Search" component={wrap(SearchScreen)} options={{ title: t('nav.search') }} />
      <Tabs.Screen name="Lists" component={wrap(WatchlistScreen)} options={{ title: t('nav.lists') }} />
      <Tabs.Screen name="Profile" component={wrap(ProfileScreen)} options={{ title: t('nav.profile') }} />
      <Tabs.Screen name="Settings" component={wrap(SettingsScreen)} options={{ title: t('nav.settings') }} />
    </Tabs.Navigator>
  );
}

/**
 * React Navigation theme derived from the active AnimAlc theme.
 * Exported because `NavigationContainer` is mounted in `App.tsx` — above
 * `AppShell` — so the global details dialog and toasts can navigate too.
 */
export function useNavigationTheme(): NavTheme {
  const theme = useTheme();
  return {
    dark: theme.mode === 'dark',
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.cardBorder,
      notification: theme.colors.accent,
    },
    fonts: {
      regular: { fontFamily: theme.typography.fontFamilyBody, fontWeight: '400' },
      medium: { fontFamily: theme.typography.fontFamilyBody, fontWeight: '500' },
      bold: { fontFamily: theme.typography.fontFamilyDisplay, fontWeight: '700' },
      heavy: { fontFamily: theme.typography.fontFamilyDisplay, fontWeight: '800' },
    },
  };
}

/** Stack navigator only — `App.tsx` owns the `NavigationContainer`. */
export function RootNavigator() {
  const theme = useTheme();

  return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: theme.reduceMotion ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="EmbedPlayer" component={EmbedPlayerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WatchTogether" component={WatchTogetherScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Customization" component={CustomizationScreen} />
        <Stack.Screen name="Effects" component={EffectsScreen} />
        <Stack.Screen name="Backgrounds" component={BackgroundStudioScreen} />
        <Stack.Screen name="ThemeStudio" component={ThemeStudioScreen} />
        <Stack.Screen name="CustomText" component={CustomTextScreen} />
        <Stack.Screen name="BannerStudio" component={BannerStudioScreen} />
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Providers" component={ProvidersScreen} />
        <Stack.Screen name="Cache" component={CacheScreen} />
        <Stack.Screen name="About" component={DetailsReadmeScreen} />
      </Stack.Navigator>
  );
}
