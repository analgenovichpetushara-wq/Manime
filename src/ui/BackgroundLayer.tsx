import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffects, useScreenBackground, useTheme } from '@/theme/ThemeProvider';
import { useLibraryStore } from '@/store/collectionsStores';
import type { BackgroundScreen } from '@/theme/backgrounds';
import { backgroundTransforms } from '@/theme/backgrounds';

const FIT_MAP: Record<string, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'fill',
  center: 'none',
  tile: 'cover',
};

export interface BackgroundLayerProps {
  screen?: BackgroundScreen;
  testID?: string;
}

/**
 * Renders the configured screen background: an *unmodified* library asset (or
 * external URI) plus a purely visual configuration (crop, zoom, rotation,
 * blur, brightness/contrast/saturation/grayscale, overlays, gradient, vignette).
 *
 * The source file is never re-encoded or rewritten — every control below only
 * changes how the layer is composited.
 */
export function BackgroundLayer({ screen, testID }: BackgroundLayerProps) {
  const theme = useTheme();
  const effects = useEffects();
  const config = useScreenBackground(screen);
  const assetUri = useLibraryStore((state) => state.assets.find((asset) => asset.id === config.assetId)?.originalUri);

  /** The original asset URI is used as-is; visual settings never rewrite it. */
  const uri = config.assetId ? assetUri : config.uri;

  const parallax = config.parallax && config.animated && !theme.reduceMotion;
  const [drift] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!parallax) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [parallax, drift]);

  const { transform, blurRadius } = backgroundTransforms(config);
  const extraBlur = effects.blur?.enabled ? Math.round(6 * effects.blur.intensity) : 0;
  const saturate = Math.max(0, Math.min(1, config.saturation)) * (1 - config.grayscale);
  const brightnessShift = config.brightness - 1;

  const hasBackground = Boolean(uri);
  if (!hasBackground) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID ?? `background-${screen ?? 'global'}`}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax ? { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) }] } : null]}>
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { opacity: config.opacity, transform }]}
          contentFit={FIT_MAP[config.fit] ?? 'cover'}
          blurRadius={blurRadius + extraBlur}
          transition={220}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      {/* Colour corrections that never touch the source file. */}
      {saturate < 1 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, opacity: (1 - saturate) * 0.75 }]} /> : null}
      {brightnessShift > 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', opacity: brightnessShift * 0.45 }]} /> : null}
      {brightnessShift < 0 ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: -brightnessShift * 0.6 }]} /> : null}

      {config.overlayColor && config.overlayOpacity > 0 ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: config.overlayColor, opacity: config.overlayOpacity }]} />
      ) : null}

      {config.gradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={config.gradient}
          style={[StyleSheet.absoluteFill, { opacity: config.gradientOpacity }]}
        />
      ) : null}

      {config.vignette > 0 ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', `rgba(0,0,0,${(config.vignette * 0.75).toFixed(3)})`]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Keeps text readable on top of any artwork. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, opacity: 0.35 }]} />
    </View>
  );
}
