import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import type { HomeBanner } from '@/data/models/banner';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export function BannerCarousel({
  banners,
  onAction,
  autoScroll = true,
}: {
  banners: HomeBanner[];
  onAction?: (banner: HomeBanner) => void;
  autoScroll?: boolean;
}) {
  const theme = useTheme();
  const { t } = useText();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!autoScroll || banners.length < 2 || theme.reduceMotion) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * (CARD_WIDTH + 12), animated: true });
        return next;
      });
    }, 6500);
    return () => clearInterval(timer);
  }, [autoScroll, banners.length, theme.reduceMotion]);

  if (!banners.length) return null;

  return (
    <View style={styles.wrapper} testID="banner-carousel">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={(event) => {
          const offset = event.nativeEvent.contentOffset.x;
          setIndex(Math.round(offset / (CARD_WIDTH + 12)));
        }}
      >
        {banners.map((banner) => (
          <Pressable
            key={banner.id}
            testID={`banner-${banner.id}`}
            onPress={() => onAction?.(banner)}
            style={[
              styles.card,
              {
                width: CARD_WIDTH,
                borderRadius: theme.shapes.radius.lg,
                backgroundColor: banner.backgroundColor ?? theme.colors.surfaceAlt,
              },
            ]}
          >
            {banner.imageUri ? (
              <Image
                source={{ uri: banner.imageUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : null}
            {banner.overlay === 'gradient' ? (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={StyleSheet.absoluteFill}
              />
            ) : banner.overlay === 'dark' ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
            ) : null}
            <View style={[styles.textWrap, { alignItems: alignmentToFlex(banner.alignment) }]}>
              {banner.title ? (
                <AppText variant="xxl" weight="800" display style={[styles.title, { color: banner.textColor ?? '#fff' }]}>
                  {banner.title}
                </AppText>
              ) : null}
              {banner.subtitle ? (
                <AppText variant="md" style={{ color: banner.textColor ?? '#e8e8e8' }} numberOfLines={2}>
                  {banner.subtitle}
                </AppText>
              ) : null}
              {banner.body ? (
                <AppText variant="sm" tone="muted" numberOfLines={2} style={styles.body}>
                  {banner.body}
                </AppText>
              ) : null}
              {banner.action && banner.action.type !== 'none' ? (
                <View style={[styles.actionChip, { backgroundColor: theme.colors.primary, borderRadius: theme.shapes.radius.pill }]}>
                  <AppText variant="sm" weight="700" style={{ color: theme.colors.primaryText }}>
                    {banner.action.label ?? (banner.action.labelKey ? t(banner.action.labelKey) : t('details.watch'))}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((banner, dotIndex) => (
            <View
              key={`${banner.id}-dot`}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex === index ? theme.colors.primary : theme.colors.progressTrack,
                  opacity: dotIndex === index ? 1 : 0.6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function alignmentToFlex(alignment: HomeBanner['alignment']): 'flex-start' | 'center' | 'flex-end' {
  if (alignment === 'center') return 'center';
  if (alignment === 'right') return 'flex-end';
  return 'flex-start';
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 12 },
  content: { paddingHorizontal: 16, gap: 12 },
  card: { height: 190, overflow: 'hidden', justifyContent: 'flex-end' },
  textWrap: { padding: 16, gap: 4 },
  title: { marginBottom: 2 },
  body: { maxWidth: '96%' },
  actionChip: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
