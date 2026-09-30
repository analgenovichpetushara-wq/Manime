import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { HomeScreen } from '@/features/home/HomeScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { WatchlistScreen } from '@/features/watchlists/WatchlistScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { AchievementsScreen } from '@/features/achievements/AchievementsScreen';
import { CustomizationScreen } from '@/features/settings/CustomizationScreen';
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

const TAB_ICONS: Record<keyof TabParamList, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Lists: { active: 'albums', inactive: 'albums-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

function TabNavigator() {
  const theme = useTheme();
  const { t } = useText();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.navActive,
        tabBarInactiveTintColor: theme.colors.navInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.navBackground,
          borderTopColor: theme.colors.cardBorder,
          borderTopWidth: theme.shapes.borderWidth,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.sizes.xs,
          fontFamily: theme.typography.fontFamilyBody,
          textTransform: theme.presentation.headlineTransform === 'uppercase' ? 'uppercase' : 'none',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name];
          const name = (theme.presentation.iconStyle === 'filled' || focused ? icons.active : icons.inactive) as keyof typeof Ionicons.glyphMap;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home') }} />
      <Tabs.Screen name="Search" component={SearchScreen} options={{ title: t('nav.search') }} />
      <Tabs.Screen name="Lists" component={WatchlistScreen} options={{ title: t('nav.lists') }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();

  const navigationTheme: NavTheme = {
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

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: theme.reduceMotion ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="WatchTogether" component={WatchTogetherScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Customization" component={CustomizationScreen} />
        <Stack.Screen name="CustomText" component={CustomTextScreen} />
        <Stack.Screen name="BannerStudio" component={BannerStudioScreen} />
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Providers" component={ProvidersScreen} />
        <Stack.Screen name="Cache" component={CacheScreen} />
        <Stack.Screen name="About" component={DetailsReadmeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
