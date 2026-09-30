import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Toggle } from '@/ui/Toggle';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { settingsActions, useSettingsStore } from '@/store/settingsStore';
import { listPresets } from '@/theme/themeEngine';
import { useThemeStore } from '@/store/themeStore';
import type { AppLanguage } from '@/data/models/settings';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SUBTITLE_SCALES = [0.85, 1, 1.2, 1.4];

function Row({
  label,
  hint,
  icon,
  onPress,
  right,
  testID,
}: {
  label: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  right?: React.ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.cardBorder }]}>
      {icon ? <Ionicons name={icon} size={18} color={theme.colors.textMuted} /> : null}
      <View style={styles.rowText}>
        <AppText variant="sm" weight="600">
          {label}
        </AppText>
        {hint ? (
          <AppText variant="xs" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {content}
    </Pressable>
  );
}

export function SettingsScreen() {
  const { t } = useText();
  const navigation = useAppNavigation();
  const settings = useSettingsStore();
  const themeStore = useThemeStore();
  const presets = useMemo(() => listPresets(), []);

  const currentPreset = presets.find((preset) => preset.id === themeStore.presetId) ?? presets[0];

  return (
    <Screen scrollable testID="settings-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('settings.title')}
        </AppText>
      </View>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('settings.appearance')}
        </AppText>
        <View style={styles.chipRow}>
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <Chip
              key={mode}
              label={t(`settings.mode.${mode}`)}
              selected={mode === 'system' ? false : settings.mode === mode}
              onPress={() => {
                if (mode === 'system') return;
                settingsActions.setMode(mode);
              }}
              testID={`mode-${mode}`}
            />
          ))}
        </View>
        <Row
          label={t('settings.amoled')}
          hint={t('settings.amoledHint')}
          right={<Toggle value={settings.amoled} onChange={() => settingsActions.toggleAmoled()} testID="toggle-amoled" />}
        />
        <Row
          label={t('settings.themePreset')}
          hint={currentPreset ? t(currentPreset.nameKey) : undefined}
          onPress={() => navigation.navigate('Customization')}
          testID="open-customization"
        />
        <Row
          label={t('settings.accent')}
          hint={settings.accentColor ?? t('settings.accentDefault')}
          onPress={() => navigation.navigate('Customization')}
        />
        <View style={styles.chipRow}>
          {[0.9, 1, 1.15, 1.3].map((scale) => (
            <Chip
              key={scale}
              label={`${Math.round(scale * 100)}%`}
              selected={Math.abs(settings.fontScale - scale) < 0.01}
              onPress={() => settingsActions.set('fontScale', scale)}
              testID={`font-scale-${scale}`}
            />
          ))}
        </View>
        <Row
          label={t('settings.reduceMotion')}
          right={<Toggle value={settings.reduceMotion} onChange={() => settingsActions.set('reduceMotion', !settings.reduceMotion)} />}
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('settings.playback')}
        </AppText>
        <View style={styles.chipRow}>
          {SPEEDS.map((speed) => (
            <Chip
              key={speed}
              label={`${speed}x`}
              selected={Math.abs(settings.playbackSpeed - speed) < 0.01}
              onPress={() => settingsActions.setPlaybackSpeed(speed)}
              testID={`speed-${speed}`}
            />
          ))}
        </View>
        <Row
          label={t('settings.autoPlayNext')}
          right={<Toggle value={settings.autoPlayNext} onChange={() => settingsActions.set('autoPlayNext', !settings.autoPlayNext)} />}
        />
        <Row
          label={t('settings.skipIntro')}
          hint={t('settings.skipIntroHint')}
          right={<Toggle value={settings.skipIntro} onChange={() => settingsActions.set('skipIntro', !settings.skipIntro)} />}
        />
        <Row
          label={t('settings.wifiOnly')}
          hint={t('settings.wifiOnlyHint')}
          right={<Toggle value={settings.wifiOnlyStreaming} onChange={() => settingsActions.set('wifiOnlyStreaming', !settings.wifiOnlyStreaming)} />}
        />
        <Row
          label={t('settings.mature')}
          hint={t('settings.matureHint')}
          right={<Toggle value={settings.matureTitlesVisible} onChange={() => settingsActions.set('matureTitlesVisible', !settings.matureTitlesVisible)} />}
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('settings.subtitles')}
        </AppText>
        <Row
          label={t('settings.subtitlesEnabled')}
          right={<Toggle value={settings.subtitleEnabled} onChange={() => settingsActions.set('subtitleEnabled', !settings.subtitleEnabled)} />}
        />
        <View style={styles.chipRow}>
          {SUBTITLE_SCALES.map((scale) => (
            <Chip
              key={scale}
              label={`${scale}x`}
              selected={Math.abs(settings.subtitleFontScale - scale) < 0.01}
              onPress={() => settingsActions.set('subtitleFontScale', scale)}
            />
          ))}
        </View>
        <View style={styles.chipRow}>
          {[0, 0.4, 0.6, 0.85].map((opacity) => (
            <Chip
              key={opacity}
              label={`${Math.round(opacity * 100)}%`}
              selected={Math.abs(settings.subtitleBackgroundOpacity - opacity) < 0.01}
              onPress={() => settingsActions.set('subtitleBackgroundOpacity', opacity)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('settings.content')}
        </AppText>
        <Row
          label={t('settings.providers')}
          hint={t('settings.providersHint')}
          onPress={() => navigation.navigate('Providers')}
          testID="open-providers"
        />
        <Row
          label={t('settings.watchTogether')}
          hint={t('settings.watchTogetherHint')}
          onPress={() => navigation.navigate('WatchTogether')}
          testID="open-watch-together"
        />
        <Row label={t('settings.customBanners')} onPress={() => navigation.navigate('BannerStudio')} testID="open-banners" />
        <Row label={t('settings.customText')} onPress={() => navigation.navigate('CustomText')} testID="open-custom-text" />
        <Row label={t('settings.library')} onPress={() => navigation.navigate('Library')} testID="open-library" />
        <Row label={t('settings.cache')} onPress={() => navigation.navigate('Cache')} testID="open-cache" />
        <Row label={t('settings.achievements')} onPress={() => navigation.navigate('Achievements')} testID="open-achievements" />
        <Row label={t('settings.about')} onPress={() => navigation.navigate('About')} testID="open-about" />
      </Card>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('settings.language')}
        </AppText>
        <View style={styles.chipRow}>
          {(['ru', 'en'] as AppLanguage[]).map((language) => (
            <Chip
              key={language}
              label={language === 'ru' ? t('settings.languageRu') : t('settings.languageEn')}
              selected={settings.language === language}
              onPress={() => settingsActions.setLanguage(language)}
              testID={`language-${language}`}
            />
          ))}
        </View>
        <Row
          label={t('settings.notifications')}
          hint={t('settings.notificationsHint')}
          right={<Toggle value={settings.notificationsEnabled} onChange={() => settingsActions.set('notificationsEnabled', !settings.notificationsEnabled)} />}
        />
      </Card>

      <Card style={styles.card}>
        <AppText variant="xs" tone="muted">
          {t('settings.about')}
        </AppText>
        <AppText variant="sm">{t('settings.aboutBody')}</AppText>
        <AppText variant="xs" tone="muted">
          {t('settings.version', { version: '1.0.0' })}
        </AppText>
        <Button label={t('settings.diagnostics')} variant="secondary" onPress={() => navigation.navigate('Providers')} />
        <Button label={t('settings.about')} variant="ghost" onPress={() => navigation.navigate('About')} />
      </Card>

      <View style={styles.footer}>
        <AppText variant="xs" tone="muted" center>
          {t('settings.legal')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginTop: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  footer: { padding: 20 },
});
