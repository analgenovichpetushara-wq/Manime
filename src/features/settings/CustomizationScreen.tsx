import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { listPresets, readableTextColor } from '@/theme/themeEngine';
import { customThemesToPresets } from '@/theme/customThemes';
import { useCustomizationStore } from '@/store/customizationStore';
import { themeActions, useThemeStore } from '@/store/themeStore';
import { settingsActions, useSettingsStore } from '@/store/settingsStore';
import { syncAchievements } from '@/services/achievementService';
import { formatPercent } from '@/core/utils/format';

const ACCENTS = ['#ff3ea5', '#7f96ff', '#22e3ff', '#7bdc8a', '#ffb703', '#ff6a2b', '#b388ff', '#4dd0c1'];

export function CustomizationScreen() {
  const theme = useTheme();
  const { t } = useText();
  const navigation = useAppNavigation();
  const themeStore = useThemeStore();
  const settings = useSettingsStore();
  const [applied, setApplied] = useState<string | null>(null);
  const appliedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customization = useCustomizationStore();
  const presets = useMemo(() => listPresets(customThemesToPresets(customization.customThemes)), [customization.customThemes]);
  const current = presets.find((preset) => preset.id === themeStore.presetId) ?? presets[0]!;

  // The swatch row shows the preset palette plus the user accent: duplicates are
  // removed so React never sees two children with the same key.
  const swatches = useMemo(() => {
    const palette = new Set<string>(ACCENTS);
    if (settings.accentColor) palette.add(settings.accentColor);
    palette.add(current.dark.accent);
    return [...palette];
  }, [settings.accentColor, current]);

  useEffect(
    () => () => {
      if (appliedTimer.current) clearTimeout(appliedTimer.current);
    },
    [],
  );

  const applyPreset = (presetId: string) => {
    themeActions.setPresetId(presetId);
    settingsActions.setThemePreset(presetId);
    syncAchievements();
    setApplied(presetId);
    if (appliedTimer.current) clearTimeout(appliedTimer.current);
    appliedTimer.current = setTimeout(() => setApplied(null), 600);
  };

  const colorOverrides = themeStore.override.colors ?? {};

  return (
    <Screen scrollable screenId="settings" testID="customization-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('customization.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('customization.subtitle')}
        </AppText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
        {presets.map((preset) => {
          const palette = settings.mode === 'light' ? preset.light : preset.dark;
          const active = preset.id === themeStore.presetId;
          return (
            <Pressable
              key={preset.id}
              testID={`preset-${preset.id}`}
              accessibilityRole="button"
              onPress={() => applyPreset(preset.id)}
              style={[
                styles.presetCard,
                {
                  backgroundColor: palette.card,
                  borderColor: active ? palette.primary : palette.cardBorder,
                  borderWidth: active ? 2 : 1,
                  borderRadius: theme.shapes.radius.md,
                },
              ]}
            >
              <View style={styles.swatches}>
                {/* Deduplicated: some presets reuse the same hex for primary and accent. */}
                {[...new Set([palette.primary, palette.accent, palette.secondary, palette.background])].map((color) => (
                  <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
                ))}
              </View>
              <AppText variant="sm" weight="700" style={{ color: palette.text }}>
                {t(preset.nameKey)}
              </AppText>
              <AppText variant="xs" style={{ color: palette.textMuted }} numberOfLines={3}>
                {t(preset.descriptionKey)}
              </AppText>
              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: palette.accent }]}>
                  <AppText variant="xs" weight="700" style={{ color: readableTextColor(palette.accent) }}>
                    {preset.shapes.borderStyle}
                  </AppText>
                </View>
                <View style={[styles.tag, { backgroundColor: palette.primary }]}>
                  <AppText variant="xs" weight="700" style={{ color: readableTextColor(palette.primary) }}>
                    {preset.presentation.cardStyle}
                  </AppText>
                </View>
              </View>
              {applied === preset.id ? (
                <AppText variant="xs" weight="700" style={{ color: palette.primary }}>
                  {t('customization.applied')}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('customization.preview')}
        </AppText>
        <View style={[styles.preview, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}>
          <View style={[styles.previewBanner, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.shapes.radius.sm }]}>
            <View style={[styles.previewChip, { backgroundColor: theme.colors.primary, borderRadius: theme.shapes.radius.pill }]} />
            <AppText variant="sm" weight="800" display>
              {t('app.name')}
            </AppText>
          </View>
          <View style={styles.previewRow}>
            <View style={[styles.previewCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}>
              <View style={[styles.previewLine, { backgroundColor: theme.colors.text }]} />
              <View style={[styles.previewLine, { backgroundColor: theme.colors.textMuted, width: '60%' }]} />
            </View>
            <View style={[styles.previewCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}>
              <View style={[styles.previewLine, { backgroundColor: theme.colors.accent }]} />
              <View style={[styles.previewLine, { backgroundColor: theme.colors.textMuted, width: '40%' }]} />
            </View>
          </View>
          <View style={[styles.previewNav, { backgroundColor: theme.colors.navBackground, borderRadius: theme.shapes.radius.sm }]}>
            {['home', 'search', 'albums', 'person'].map((icon) => (
              <Ionicons key={icon} name={icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.colors.navInactive} />
            ))}
          </View>
        </View>
        <AppText variant="xs" tone="muted">
          {t('customization.contrast', { ratio: themeContrast(theme) })}
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('settings.accent')}
        </AppText>
        <View style={styles.swatchRow}>
          {swatches.map((accent) => (
            <Pressable
              key={accent}
              testID={`accent-${accent}`}
              accessibilityRole="button"
              onPress={() => {
                settingsActions.setAccent(accent);
                themeActions.patchOverride({ colors: { accent } });
              }}
              style={[
                styles.accentSwatch,
                { backgroundColor: accent, borderColor: theme.colors.accent === accent ? theme.colors.text : 'transparent' },
              ]}
            />
          ))}
          <Chip
            label={t('customization.resetAccent')}
            onPress={() => {
              settingsActions.setAccent(undefined);
              themeActions.patchOverride({ colors: {} });
            }}
          />
        </View>
        <AppText variant="xs" tone="muted">
          {t('customization.accentHint')}
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('customization.presets')}
        </AppText>
        <View style={styles.chipRow}>
          {presets.map((preset) => (
            <Chip key={preset.id} label={t(preset.nameKey)} selected={preset.id === themeStore.presetId} onPress={() => applyPreset(preset.id)} />
          ))}
        </View>
        <AppText variant="xs" tone="muted">
          {t('customization.details', { count: Object.keys(colorOverrides).length })}
        </AppText>
      </Card>

      <View style={styles.actions}>
        <Button label={t('effects.title')} onPress={() => navigation.navigate('Effects')} testID="open-effects" />
        <Button label={t('backgrounds.title')} variant="secondary" onPress={() => navigation.navigate('Backgrounds')} testID="open-backgrounds" />
        <Button label={t('themeStudio.title')} variant="secondary" onPress={() => navigation.navigate('ThemeStudio')} testID="open-theme-studio" />
        <Button
          label={t('customization.resetOverrides')}
          variant="ghost"
          onPress={() => themeActions.resetOverride()}
          testID="reset-theme-overrides"
        />
        <Button label={t('settings.customText')} variant="ghost" onPress={() => navigation.navigate('CustomText')} />
      </View>

      <View style={styles.footer}>
        <AppText variant="xs" tone="muted" center>
          {t('customization.note')}
        </AppText>
        <AppText variant="xs" tone="muted" center>
          {t('customization.payload', { bytes: formatPercent(current.dark.primary.length / 100) })}
        </AppText>
      </View>
    </Screen>
  );
}

function themeContrast(theme: ReturnType<typeof useTheme>): string {
  const luminance = (hex: string) => {
    const value = hex.replace('#', '');
    const r = Number.parseInt(value.slice(0, 2), 16) || 0;
    const g = Number.parseInt(value.slice(2, 4), 16) || 0;
    const b = Number.parseInt(value.slice(4, 6), 16) || 0;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const a = luminance(theme.colors.background);
  const b = luminance(theme.colors.text);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return ratio.toFixed(2);
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  presetRow: { gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  presetCard: { width: 168, padding: 12, gap: 6 },
  swatches: { flexDirection: 'row', gap: 4 },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  card: { marginHorizontal: 16, marginTop: 8, gap: 8 },
  preview: { borderWidth: 1, padding: 12, gap: 10 },
  previewBanner: { padding: 10, gap: 6, alignItems: 'flex-start' },
  previewChip: { width: 48, height: 12 },
  previewRow: { flexDirection: 'row', gap: 8 },
  previewCard: { flex: 1, borderWidth: 1, padding: 8, gap: 6 },
  previewLine: { height: 8, borderRadius: 4, width: '80%' },
  previewNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  accentSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { paddingHorizontal: 16, marginTop: 20, gap: 10 },
  footer: { padding: 20, gap: 4 },
});
