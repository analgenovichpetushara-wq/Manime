import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { useCardStyle, useTheme } from '@/theme/ThemeProvider';
import { hexWithAlpha } from '@/theme/themeEngine';

export interface PosterCardProps {
  title: string;
  subtitle?: string;
  poster?: string;
  width?: number;
  progressRatio?: number;
  badge?: string;
  onPress?: () => void;
  testID?: string;
}

/**
 * Anime card. Every visual decision (radius, border, glow, ratio, title
 * placement, badges) comes from the active card style tokens, so the ten
 * built-in card styles need no changes here.
 */
export function PosterCard({ title, subtitle, poster, width = 124, progressRatio, badge, onPress, testID }: PosterCardProps) {
  const theme = useTheme();
  const card = useCardStyle();
  const height = Math.round(width * card.ratio);
  const radius = theme.shapes.radius.md * card.radiusScale;
  const borderColor =
    card.borderColor === 'accent' ? theme.colors.primary : card.borderColor === 'theme' ? theme.colors.cardBorder : 'transparent';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        { width: width + card.padding * 2 },
        pressed && card.press === 'fade' ? { opacity: 0.85 } : null,
        pressed && card.press === 'scale' ? { transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      <View
        style={{
          padding: card.padding,
          borderRadius: radius + card.padding,
          transform: card.rotateDeg ? [{ rotate: `${card.rotateDeg}deg` }] : undefined,
          backgroundColor: card.padding ? theme.colors.surface : 'transparent',
        }}
      >
        <View
          style={[
            styles.poster,
            {
              width,
              height,
              borderRadius: radius,
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: card.borderWidth,
              borderColor,
              shadowColor: '#000',
              shadowOpacity: card.shadowOpacity,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: card.shadowOpacity > 0 ? Math.round(card.shadowOpacity * 10) : 0,
            },
          ]}
        >
          {card.glowOpacity > 0 ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: radius,
                  backgroundColor: hexWithAlpha(theme.colors.primary, card.glowOpacity),
                  transform: [{ scale: 1.06 }],
                  opacity: 0.6,
                },
              ]}
            />
          ) : null}

          {poster ? (
            <Image
              source={{ uri: poster }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholder}>
              <AppText variant="xs" tone="muted" center>
                {title.slice(0, 2).toUpperCase()}
              </AppText>
            </View>
          )}

          {card.overlayOpacity > 0 ? (
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', `rgba(0,0,0,${card.overlayOpacity})`]}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {card.showBadge && badge ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.overlay, borderRadius: theme.shapes.radius.sm }]}>
              <AppText variant="xs" weight="700" style={{ color: '#fff' }}>
                {badge}
              </AppText>
            </View>
          ) : null}

          {card.titlePosition === 'overlay' ? (
            <View style={styles.overlayText} pointerEvents="none">
              <AppText variant="sm" weight="700" numberOfLines={2} style={{ color: '#fff' }}>
                {title}
              </AppText>
              {card.showSubtitle && subtitle ? (
                <AppText variant="xs" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {card.showProgress && progressRatio !== undefined ? (
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.progressTrack }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(0, Math.min(1, progressRatio)) * 100}%`,
                    backgroundColor: theme.colors.progressFill,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>

      {card.titlePosition === 'below' ? (
        <AppText variant="sm" weight="600" numberOfLines={2} style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {card.titlePosition === 'below' && card.showSubtitle && subtitle ? (
        <AppText variant="xs" tone="muted" numberOfLines={1}>
          {subtitle}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  poster: { overflow: 'hidden', justifyContent: 'flex-end' },
  placeholder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2 },
  overlayText: { position: 'absolute', left: 8, right: 8, bottom: 10 },
  progressTrack: { height: 4, width: '100%' },
  progressFill: { height: 4 },
  title: { marginTop: 6 },
});
