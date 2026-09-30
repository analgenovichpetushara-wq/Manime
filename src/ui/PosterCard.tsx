import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

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

export function PosterCard({ title, subtitle, poster, width = 124, progressRatio, badge, onPress, testID }: PosterCardProps) {
  const theme = useTheme();
  const height = width * 1.48;

  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ width }, pressed ? { opacity: 0.85 } : null]}>
      <View
        style={[
          styles.poster,
          {
            width,
            height,
            borderRadius: theme.shapes.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: theme.presentation.cardStyle === 'outlined' ? theme.shapes.borderWidth : 0,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
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
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.overlay, borderRadius: theme.shapes.radius.sm }]}>
            <AppText variant="xs" weight="700" style={{ color: '#fff' }}>
              {badge}
            </AppText>
          </View>
        ) : null}
        {progressRatio !== undefined ? (
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
      <AppText variant="sm" weight="600" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
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
  progressTrack: { height: 4, width: '100%' },
  progressFill: { height: 4 },
  title: { marginTop: 6 },
});
