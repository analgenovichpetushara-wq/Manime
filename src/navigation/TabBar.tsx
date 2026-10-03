import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from '@/ui/AppText';
import { useNavStyle, useTheme } from '@/theme/ThemeProvider';
import { hexWithAlpha } from '@/theme/themeEngine';
import type { TabParamList } from '@/navigation/types';

export const TAB_ICONS: Record<keyof TabParamList, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Lists: { active: 'albums', inactive: 'albums-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

/** Width reserved for the vertical rail; screens inset by this amount. */
export const VERTICAL_RAIL_WIDTH = 68;

/**
 * Shared tab bar. The look is entirely driven by the active navigation style
 * tokens (height, labels, floating, blur, indicator, glow, orientation), so the
 * seven built-in navigation styles need no changes here.
 */
export function ThemedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const nav = useNavStyle();
  const vertical = nav.orientation === 'vertical';

  const background = hexWithAlpha(theme.colors.navBackground, nav.backgroundOpacity);
  const borderColor =
    nav.borderColorMode === 'accent' ? theme.colors.primary : nav.borderColorMode === 'theme' ? theme.colors.cardBorder : 'transparent';

  const containerStyle = vertical
    ? [
        styles.vertical,
        {
          backgroundColor: nav.translucent ? 'transparent' : background,
          borderColor,
          borderWidth: nav.borderWidth,
          borderRadius: nav.cornerRadius,
          margin: nav.margin,
        },
      ]
    : [
        styles.horizontal,
        {
          height: nav.height,
          backgroundColor: nav.translucent ? 'transparent' : background,
          borderColor,
          borderWidth: nav.borderWidth,
          borderRadius: nav.cornerRadius,
          marginLeft: nav.margin,
          marginRight: nav.margin,
          marginBottom: nav.floating ? nav.margin : 0,
          shadowColor: '#000',
          shadowOpacity: nav.floating ? 0.28 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          elevation: nav.floating && Platform.OS === 'android' ? 12 : 0,
        },
      ];

  const inner = (
    <>
      {nav.translucent ? (
        <BlurView
          intensity={50}
          tint={theme.mode === 'dark' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: nav.cornerRadius, backgroundColor: background }]}
        />
      ) : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const title = descriptors[route.key]?.options.title;
        const label = typeof title === 'string' ? title : route.name;
        const icons = TAB_ICONS[route.name as keyof TabParamList];
        const color = focused ? theme.colors.navActive : theme.colors.navInactive;
        const iconName = (theme.presentation.iconStyle === 'filled' || focused ? icons.active : icons.inactive) as keyof typeof Ionicons.glyphMap;

        return (
          <Pressable
            key={route.key}
            testID={`nav-${route.name}`}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            onPress={() => navigation.navigate(route.name)}
            style={[vertical ? styles.verticalItem : styles.item, { minHeight: vertical ? 44 : undefined }]}
          >
            {focused && nav.glowOpacity > 0 ? (
              <View pointerEvents="none" style={[styles.glow, { backgroundColor: hexWithAlpha(theme.colors.navActive, nav.glowOpacity) }]} />
            ) : null}
            {focused && nav.indicator === 'pill' ? (
              <View
                pointerEvents="none"
                style={[styles.pill, { backgroundColor: hexWithAlpha(theme.colors.navActive, 0.16), borderRadius: theme.shapes.radius.pill }]}
              />
            ) : null}
            <Ionicons name={iconName} size={nav.iconSize} color={color} />
            {nav.showLabels ? (
              <AppText variant="xs" weight={focused ? '700' : '500'} style={{ color, marginTop: 3, fontSize: 10 }}>
                {label}
              </AppText>
            ) : null}
            {focused && nav.indicator === 'dot' ? (
              <View pointerEvents="none" style={[styles.dot, { backgroundColor: theme.colors.navActive }]} />
            ) : null}
            {focused && nav.indicator === 'underline' ? (
              <View pointerEvents="none" style={[styles.underline, { backgroundColor: theme.colors.navActive }]} />
            ) : null}
          </Pressable>
        );
      })}
    </>
  );

  return (
    <View testID="tab-bar" style={[styles.wrap, vertical ? styles.wrapVertical : null]}>
      <View style={containerStyle}>{inner}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  wrapVertical: { position: 'absolute', left: 0, top: 0, bottom: 0, width: VERTICAL_RAIL_WIDTH + 24 },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  vertical: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    width: VERTICAL_RAIL_WIDTH,
    overflow: 'hidden',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verticalItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, width: '100%' },
  glow: { position: 'absolute', width: 46, height: 46, borderRadius: 23 },
  pill: { position: 'absolute', width: 52, height: 40, borderRadius: 20 },
  dot: { position: 'absolute', bottom: -5, width: 4, height: 4, borderRadius: 2 },
  underline: { position: 'absolute', bottom: -2, width: 22, height: 2, borderRadius: 1 },
});
