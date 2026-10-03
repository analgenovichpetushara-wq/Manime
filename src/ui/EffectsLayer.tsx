import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffects, useTheme } from '@/theme/ThemeProvider';
import { hexWithAlpha } from '@/theme/themeEngine';
import type { EffectRuntime } from '@/theme/effects';

export interface EffectsLayerProps {
  /** Skip the heaviest effects (used by the player and low-end mode). */
  minimal?: boolean;
  pointerEvents?: 'none' | 'box-none';
  testID?: string;
}

const SCANLINE_STOPS = 42;

type GradientColors = readonly [string, string, ...string[]];

function buildScanlineColors(color: string, opacity: number): GradientColors {
  const colors: string[] = [];
  for (let index = 0; index < SCANLINE_STOPS; index += 1) {
    colors.push(index % 2 === 0 ? hexWithAlpha(color, opacity) : 'rgba(0,0,0,0)');
  }
  return [colors[0]!, colors[1]!, ...colors.slice(2)] as GradientColors;
}

/**
 * Renders the resolved effects as overlays above a screen's background.
 *
 * Everything is driven by `resolveEffects`, so accessibility switches (reduce
 * motion, disable flashing, high contrast, reduced blur) and the automatic
 * performance mode are already applied before anything is drawn here.
 */
export function EffectsLayer({ minimal = false, pointerEvents = 'none', testID }: EffectsLayerProps) {
  const theme = useTheme();
  const effects = useEffects();
  const active = useMemo(
    () =>
      Object.values(effects).filter(
        (effect) => effect.enabled && (!minimal || !['particles', 'floatingParticles', 'distortion', 'vhs'].includes(effect.id)),
      ),
    [effects, minimal],
  );

  if (!active.length) return null;

  return (
    <View pointerEvents={pointerEvents} style={StyleSheet.absoluteFill} testID={testID ?? 'effects-layer'}>
      {active.map((effect) => (
        <EffectView key={effect.id} effect={effect} accent={theme.colors.primary} mode={theme.mode} reduceMotion={theme.reduceMotion} />
      ))}
    </View>
  );
}

function EffectView({
  effect,
  accent,
  mode,
  reduceMotion,
}: {
  effect: EffectRuntime;
  accent: string;
  mode: 'light' | 'dark';
  reduceMotion: boolean;
}) {
  const animated = effect.animated && !reduceMotion;
  const [pulse] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const driftLoop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    driftLoop.start();
    return () => {
      loop.stop();
      driftLoop.stop();
    };
  }, [animated, pulse, drift]);

  const strength = effect.intensity;

  switch (effect.id) {
    case 'scanlines':
      return (
        <LinearGradient
          pointerEvents="none"
          colors={buildScanlineColors(mode === 'dark' ? '#000000' : '#ffffff', 0.16 * strength + 0.04)}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      );
    case 'noise':
    case 'filmGrain': {
      const colors = buildScanlineColors(mode === 'dark' ? '#ffffff' : '#000000', 0.05 * strength + 0.02);
      const node = (
        <LinearGradient
          pointerEvents="none"
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      );
      return animated ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }]}>
          {node}
        </Animated.View>
      ) : (
        node
      );
    }
    case 'vignette':
      return (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', `rgba(0,0,0,${(0.55 * strength).toFixed(3)})`]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[`rgba(0,0,0,${(0.35 * strength).toFixed(3)})`, 'rgba(0,0,0,0)']}
            style={styles.topThird}
          />
        </>
      );
    case 'glow':
    case 'bloom':
      return (
        <LinearGradient
          pointerEvents="none"
          colors={[hexWithAlpha(accent, 0.18 * strength), 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      );
    case 'chromaticAberration':
      return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.edgeLeft, { backgroundColor: hexWithAlpha('#ff004c', 0.16 * strength) }]} />
          <View style={[styles.edgeRight, { backgroundColor: hexWithAlpha('#00e5ff', 0.16 * strength) }]} />
        </View>
      );
    case 'rgbSplit':
    case 'glitch': {
      const bars = Math.max(2, Math.round(4 * strength + 2));
      return (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            animated
              ? {
                  opacity: pulse.interpolate({ inputRange: [0, 0.4, 0.6, 1], outputRange: [0.15, 0.5 * strength, 0.1, 0.35 * strength] }),
                  transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-3 * strength, 3 * strength] }) }],
                }
              : { opacity: 0.2 * strength },
          ]}
        >
          {Array.from({ length: bars }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.glitchBar,
                {
                  top: `${(index * 97) % 92}%`,
                  height: 2 + (index % 3) * 2,
                  backgroundColor: hexWithAlpha(index % 2 === 0 ? '#ff00e5' : '#00ff9d', 0.25 * strength),
                },
              ]}
            />
          ))}
        </Animated.View>
      );
    }
    case 'crt':
    case 'vhs': {
      const node = (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            pointerEvents="none"
            colors={buildScanlineColors('#000000', 0.12 * strength)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.trackingBar, { backgroundColor: `rgba(255,255,255,${(0.06 * strength).toFixed(3)})` }]} />
        </View>
      );
      return animated ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-120, 720] }) }] }]}
        >
          {node}
        </Animated.View>
      ) : (
        node
      );
    }
    case 'pixelation':
      return (
        <LinearGradient
          pointerEvents="none"
          colors={buildScanlineColors(mode === 'dark' ? '#ffffff' : '#000000', 0.1 * strength)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      );
    case 'distortion': {
      const node = (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.edgeLeft, { backgroundColor: hexWithAlpha(accent, 0.12 * strength), width: 8 }]} />
          <View style={[styles.edgeRight, { backgroundColor: hexWithAlpha(accent, 0.12 * strength), width: 8 }]} />
        </View>
      );
      return animated ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ skewX: drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-0.4deg', '0.4deg', '-0.4deg'] }) }] }]}
        >
          {node}
        </Animated.View>
      ) : (
        node
      );
    }
    case 'animatedGradient':
      return (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            animated ? { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }) } : { opacity: 0.35 },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[hexWithAlpha(accent, 0.35 * strength), 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      );
    case 'particles':
    case 'floatingParticles': {
      const count = Math.max(4, Math.round(10 * strength));
      return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: count }).map((_, index) => {
            const size = 2 + ((index * 5) % 4);
            if (!animated) {
              return (
                <View
                  key={index}
                  style={[
                    styles.particle,
                    {
                      left: `${(index * 37) % 96}%`,
                      bottom: `${(index * 23) % 90}%`,
                      width: size,
                      height: size,
                      borderRadius: size,
                      backgroundColor: hexWithAlpha(index % 3 === 0 ? accent : '#ffffff', 0.22 * strength + 0.05),
                    },
                  ]}
                />
              );
            }
            return (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    left: `${(index * 37) % 96}%`,
                    width: size,
                    height: size,
                    borderRadius: size,
                    backgroundColor: hexWithAlpha(index % 3 === 0 ? accent : '#ffffff', 0.22 * strength + 0.05),
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                    transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [40, -40] }) }],
                  },
                ]}
              />
            );
          })}
        </View>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  topThird: { position: 'absolute', top: 0, left: 0, right: 0, height: '33%' },
  edgeLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3 },
  edgeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 3 },
  glitchBar: { position: 'absolute', left: 0, right: 0 },
  trackingBar: { position: 'absolute', left: 0, right: 0, top: '40%', height: 26 },
  particle: { position: 'absolute', bottom: '20%' },
});
