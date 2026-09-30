import React, { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { AppText } from '@/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { formatClock } from '@/core/utils/time';
import { clamp } from '@/core/utils/collections';

interface TimelineProps {
  positionSec: number;
  durationSec: number;
  bufferedSec?: number;
  onSeek: (positionSec: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  disabled?: boolean;
  testID?: string;
}

/** Converts a horizontal touch offset into a 0…1 ratio of the track width. */
function ratioFrom(offsetX: number, width: number): number {
  return width > 0 ? clamp(offsetX / width, 0, 1) : 0;
}

/** Scrubbable progress bar with a wider hit area than the visible track. */
export function Timeline({
  positionSec,
  durationSec,
  bufferedSec,
  onSeek,
  onScrubStart,
  onScrubEnd,
  disabled,
  testID = 'player-timeline',
}: TimelineProps) {
  const theme = useTheme();
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => {
          onScrubStart?.();
          setScrubRatio(ratioFrom(event.nativeEvent.locationX, width));
        },
        onPanResponderMove: (event) => {
          setScrubRatio(ratioFrom(event.nativeEvent.locationX, width));
        },
        onPanResponderRelease: (event) => {
          const ratio = ratioFrom(event.nativeEvent.locationX, width);
          setScrubRatio(null);
          onSeek(ratio * (durationSec || 0));
          onScrubEnd?.();
        },
        onPanResponderTerminate: () => {
          setScrubRatio(null);
          onScrubEnd?.();
        },
      }),
    [disabled, durationSec, onScrubEnd, onScrubStart, onSeek, width],
  );

  const ratio = scrubRatio ?? (durationSec > 0 ? clamp(positionSec / durationSec, 0, 1) : 0);
  const bufferedRatio = durationSec > 0 && bufferedSec ? clamp(bufferedSec / durationSec, 0, 1) : 0;
  const shownPosition = scrubRatio != null ? scrubRatio * durationSec : positionSec;

  return (
    <View style={styles.wrapper} testID={testID}>
      <View style={styles.hitArea} onLayout={handleLayout} {...responder.panHandlers}>
        <View style={[styles.track, { backgroundColor: theme.colors.progressTrack }]}>
          <View style={[styles.buffered, { width: `${bufferedRatio * 100}%`, backgroundColor: theme.colors.chipBackground }]} />
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.colors.progressFill }]} />
          <View style={[styles.thumb, { left: `${ratio * 100}%`, backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
      <View style={styles.timeRow}>
        <AppText variant="xs" tone="muted">
          {formatClock(shownPosition)}
        </AppText>
        <AppText variant="xs" tone="muted">
          {formatClock(durationSec)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4, justifyContent: 'center' },
  hitArea: { paddingVertical: 10, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'visible' },
  buffered: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 2 },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 2 },
  thumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, marginLeft: -7 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
