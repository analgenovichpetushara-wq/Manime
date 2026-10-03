import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Stepper } from '@/ui/Stepper';
import { Toggle } from '@/ui/Toggle';
import { useText } from '@/i18n/useText';
import { useTheme } from '@/theme/ThemeProvider';
import { customizationActions, useCustomizationStore } from '@/store/customizationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { EFFECTS, EFFECT_LEVELS, hasFlashingEffects, PRESET_EFFECTS, resolveEffects, type EffectId, type EffectLevel, type PerformanceMode } from '@/theme/effects';

const LEVEL_OPTIONS: { value: EffectLevel; label: string }[] = EFFECT_LEVELS.map((level) => ({ value: level, label: `effects.level.${level}` }));
const PERFORMANCE_OPTIONS: { value: PerformanceMode; label: string }[] = [
  { value: 'auto', label: 'effects.performance.auto' },
  { value: 'high', label: 'effects.performance.high' },
  { value: 'balanced', label: 'effects.performance.balanced' },
  { value: 'battery', label: 'effects.performance.battery' },
];

/** Low / Medium / High / Extreme — the global intensity of the active preset. */
const INTENSITY_LEVELS: EffectLevel[] = ['low', 'medium', 'high', 'extreme'];

export function EffectsScreen() {
  const { t } = useText();
  const theme = useTheme();
  const customization = useCustomizationStore();
  const settings = useSettingsStore();

  const resolved = useMemo(
    () =>
      resolveEffects({
        presetId: settings.themePresetId,
        levels: customization.effectLevels,
        performanceMode: customization.performanceMode,
        accessibility: {
          reduceMotion: settings.reduceMotion || customization.accessibility.reduceMotion || !customization.animationsEnabled,
          disableFlashing: customization.accessibility.disableFlashing,
          highContrast: customization.accessibility.highContrast,
          reducedTransparency: customization.accessibility.reducedTransparency,
          reducedBlur: customization.accessibility.reducedBlur,
        },
      }),
    [
      settings.themePresetId,
      settings.reduceMotion,
      customization.effectLevels,
      customization.performanceMode,
      customization.animationsEnabled,
      customization.accessibility,
    ],
  );

  const flashing = hasFlashingEffects(resolved);
  const presetEffectIds = Object.keys(PRESET_EFFECTS[settings.themePresetId] ?? {}) as EffectId[];

  const applyIntensity = (level: EffectLevel) => {
    presetEffectIds.forEach((id) => customizationActions.setEffectLevel(id, level));
  };

  const currentIntensity = (() => {
    if (!presetEffectIds.length) return undefined;
    const levels = presetEffectIds.map((id) => customization.effectLevels[id] ?? PRESET_EFFECTS[settings.themePresetId]?.[id] ?? 'off');
    const unique = new Set(levels);
    return unique.size === 1 ? [...unique][0] : undefined;
  })();

  return (
    <Screen scrollable screenId="settings" testID="effects-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('effects.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('effects.subtitle')}
        </AppText>
      </View>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('effects.presetIntensity')}
        </AppText>
        <View style={styles.row}>
          {INTENSITY_LEVELS.map((level) => (
            <Chip
              key={level}
              label={t(`effects.level.${level}`)}
              selected={currentIntensity === level}
              onPress={() => applyIntensity(level)}
              testID={`intensity-${level}`}
            />
          ))}
        </View>
        <AppText variant="xs" tone="muted">
          {t('effects.presetIntensityHint')}
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('effects.effects')}
        </AppText>
        {EFFECTS.map((definition) => (
          <Stepper
            key={definition.id}
            testID={`effect-${definition.id}`}
            label={t(definition.nameKey)}
            value={customization.effectLevels[definition.id] ?? PRESET_EFFECTS[settings.themePresetId]?.[definition.id] ?? 'off'}
            options={LEVEL_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))}
            onChange={(level) => customizationActions.setEffectLevel(definition.id, level)}
          />
        ))}
        <Button label={t('effects.reset')} variant="secondary" onPress={() => customizationActions.resetEffects()} testID="effects-reset" />
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('effects.performance')}
        </AppText>
        <View style={styles.row}>
          {PERFORMANCE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={t(option.label)}
              selected={customization.performanceMode === option.value}
              onPress={() => customizationActions.setPerformanceMode(option.value)}
              testID={`performance-${option.value}`}
            />
          ))}
        </View>
        <Toggle
          value={customization.animationsEnabled}
          onChange={(value) => customizationActions.setAnimationsEnabled(value)}
          accessibilityLabel={t('effects.animations')}
          testID="toggle-animations"
        />
        <AppText variant="xs" tone="muted">
          {t('effects.animations')}
        </AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('effects.accessibility')}
        </AppText>
        {(
          [
            ['reduceMotion', 'effects.reduceMotion'],
            ['disableFlashing', 'effects.disableFlashing'],
            ['highContrast', 'effects.highContrast'],
            ['largerText', 'effects.largerText'],
            ['reducedTransparency', 'effects.reducedTransparency'],
            ['reducedBlur', 'effects.reducedBlur'],
            ['simplifiedUi', 'effects.simplifiedUi'],
            ['readableText', 'effects.readableText'],
          ] as const
        ).map(([key, labelKey]) => (
          <View key={key} style={styles.toggleRow}>
            <AppText variant="sm">{t(labelKey)}</AppText>
            <Toggle
              value={customization.accessibility[key]}
              onChange={(value) => customizationActions.patchAccessibility({ [key]: value })}
              testID={`accessibility-${key}`}
            />
          </View>
        ))}
        {flashing && !customization.accessibility.disableFlashing ? (
          <AppText variant="xs" style={{ color: theme.colors.warning }}>
            {t('effects.flashingWarning')}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  card: { marginHorizontal: 16, marginTop: 12, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
