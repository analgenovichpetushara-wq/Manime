import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { Screen } from '@/ui/Screen';
import { Stepper } from '@/ui/Stepper';
import { Toggle } from '@/ui/Toggle';
import { BackgroundLayer } from '@/ui/BackgroundLayer';
import { useText } from '@/i18n/useText';
import { useTheme } from '@/theme/ThemeProvider';
import { customizationActions, useCustomizationStore } from '@/store/customizationStore';
import { useLibraryStore } from '@/store/collectionsStores';
import { pickAndImport } from '@/services/mediaService';
import { BACKGROUND_SCREENS, createDefaultBackground, resolveBackground, type BackgroundFit, type BackgroundScreen, type ScreenBackgroundConfig } from '@/theme/backgrounds';

type Target = BackgroundScreen | 'global';

const FITS: { value: BackgroundFit; label: string }[] = [
  { value: 'cover', label: 'backgrounds.fit.cover' },
  { value: 'contain', label: 'backgrounds.fit.contain' },
  { value: 'fill', label: 'backgrounds.fit.fill' },
  { value: 'center', label: 'backgrounds.fit.center' },
  { value: 'tile', label: 'backgrounds.fit.tile' },
];

const OVERLAY_COLORS = ['#000000', '#1b1035', '#3a0d16', '#0d2438', '#123018', '#ffffff'];

const numberOptions = (values: number[], format = (value: number) => String(value)) =>
  values.map((value) => ({ value, label: format(value) }));

export function BackgroundStudioScreen() {
  const { t } = useText();
  const theme = useTheme();
  const customization = useCustomizationStore();
  const library = useLibraryStore();
  const [target, setTarget] = useState<Target>('global');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: ScreenBackgroundConfig = resolveBackground(
    customization.backgrounds,
    target === 'global' ? undefined : target,
  );

  const previewConfig = useMemo<ScreenBackgroundConfig>(() => config, [config]);

  const update = (patch: Partial<ScreenBackgroundConfig>) => {
    const next: ScreenBackgroundConfig = { ...(target === 'global' ? customization.backgrounds.global : config), ...patch };
    customizationActions.setBackground(target, next);
  };

  const pickFromDevice = async () => {
    setError(null);
    try {
      const assets = await pickAndImport();
      const asset = assets?.[0];
      if (asset) update({ assetId: asset.id, uri: undefined, isGif: asset.kind === 'gif' });
    } catch {
      setError(t('backgrounds.permissionError'));
    }
  };

  return (
    <Screen scrollable screenId={target === 'global' ? undefined : target} testID="background-studio-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('backgrounds.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('backgrounds.subtitle')}
        </AppText>
      </View>

      <Card style={styles.card}>
        <View style={styles.toggleRow}>
          <AppText variant="sm" weight="600">
            {t('backgrounds.useEverywhere')}
          </AppText>
          <Toggle
            value={customization.backgrounds.useEverywhere}
            onChange={(value) => customizationActions.setUseEverywhere(value)}
            testID="toggle-use-everywhere"
          />
        </View>
        <View style={styles.row}>
          <Chip label={t('backgrounds.global')} selected={target === 'global'} onPress={() => setTarget('global')} testID="bg-target-global" />
          {BACKGROUND_SCREENS.map((screen) => (
            <Chip
              key={screen}
              label={t(`backgrounds.screen.${screen}`)}
              selected={target === screen}
              onPress={() => setTarget(screen)}
              testID={`bg-target-${screen}`}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('backgrounds.preview')}
        </AppText>
        <View
          style={[
            styles.preview,
            { borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md, backgroundColor: theme.colors.surfaceAlt },
          ]}
          testID="background-preview"
        >
          <BackgroundLayer screen={target === 'global' ? undefined : target} testID="background-preview-layer" />
          <View style={styles.previewContent}>
            <AppText variant="md" weight="800" display>
              {t('app.name')}
            </AppText>
            <AppText variant="xs" tone="muted">
              {t('backgrounds.previewHint')}
            </AppText>
          </View>
        </View>
        <View style={styles.row}>
          <Button label={t('backgrounds.fromDevice')} onPress={pickFromDevice} testID="bg-pick-device" />
          <Button label={t('backgrounds.fromLibrary')} variant="secondary" onPress={() => setPickerOpen(true)} testID="bg-pick-library" />
          <Button
            label={t('backgrounds.clear')}
            variant="ghost"
            onPress={() => customizationActions.clearBackground(target)}
            testID="bg-clear"
          />
        </View>
        {error ? (
          <AppText variant="xs" style={{ color: theme.colors.danger }}>
            {error}
          </AppText>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('backgrounds.adjust')}
        </AppText>
        <Stepper
          testID="bg-fit"
          label={t('backgrounds.fit')}
          value={previewConfig.fit}
          options={FITS.map((fit) => ({ value: fit.value, label: t(fit.label) }))}
          onChange={(fit) => update({ fit })}
        />
        <Stepper
          testID="bg-zoom"
          label={t('backgrounds.zoom')}
          value={previewConfig.zoom}
          options={numberOptions([0.75, 1, 1.25, 1.5, 2, 3])}
          onChange={(zoom) => update({ zoom })}
        />
        <Stepper
          testID="bg-blur"
          label={t('backgrounds.blur')}
          value={previewConfig.blur}
          options={numberOptions([0, 4, 10, 20, 30])}
          onChange={(blur) => update({ blur })}
        />
        <Stepper
          testID="bg-opacity"
          label={t('backgrounds.opacity')}
          value={previewConfig.opacity}
          options={numberOptions([0.3, 0.5, 0.7, 0.85, 1])}
          onChange={(opacity) => update({ opacity })}
        />
        <Stepper
          testID="bg-brightness"
          label={t('backgrounds.brightness')}
          value={previewConfig.brightness}
          options={numberOptions([0.6, 0.8, 1, 1.2])}
          onChange={(brightness) => update({ brightness })}
        />
        <Stepper
          testID="bg-saturation"
          label={t('backgrounds.saturation')}
          value={previewConfig.saturation}
          options={numberOptions([0, 0.5, 1, 1.3])}
          onChange={(saturation) => update({ saturation })}
        />
        <Stepper
          testID="bg-grayscale"
          label={t('backgrounds.grayscale')}
          value={previewConfig.grayscale}
          options={numberOptions([0, 0.3, 0.6, 1])}
          onChange={(grayscale) => update({ grayscale })}
        />
        <Stepper
          testID="bg-vignette"
          label={t('backgrounds.vignette')}
          value={previewConfig.vignette}
          options={numberOptions([0, 0.25, 0.5, 0.8])}
          onChange={(vignette) => update({ vignette })}
        />
        <AppText variant="xs" tone="muted">
          {t('backgrounds.overlay')}
        </AppText>
        <View style={styles.row}>
          {OVERLAY_COLORS.map((color) => (
            <Pressable
              key={color}
              testID={`bg-overlay-${color}`}
              accessibilityRole="button"
              onPress={() => update({ overlayColor: color, overlayOpacity: previewConfig.overlayOpacity > 0 ? previewConfig.overlayOpacity : 0.4 })}
              style={[
                styles.overlaySwatch,
                { backgroundColor: color, borderColor: previewConfig.overlayColor === color ? theme.colors.text : theme.colors.cardBorder },
              ]}
            />
          ))}
          <Chip label={t('backgrounds.overlayOff')} selected={!previewConfig.overlayColor} onPress={() => update({ overlayColor: undefined, overlayOpacity: 0 })} />
        </View>
        <Stepper
          testID="bg-overlay-opacity"
          label={t('backgrounds.overlayOpacity')}
          value={previewConfig.overlayOpacity}
          options={numberOptions([0, 0.2, 0.4, 0.6, 0.8])}
          onChange={(overlayOpacity) => update({ overlayOpacity })}
        />
        <View style={styles.toggleRow}>
          <AppText variant="sm" weight="600">
            {t('backgrounds.gradient')}
          </AppText>
          <Toggle
            value={Boolean(previewConfig.gradient)}
            onChange={(value) =>
              update(value ? { gradient: [theme.colors.background, 'rgba(0,0,0,0)'], gradientOpacity: 0.6 } : { gradient: null })
            }
            testID="toggle-gradient"
          />
        </View>
        <View style={styles.toggleRow}>
          <AppText variant="sm" weight="600">
            {t('backgrounds.animated')}
          </AppText>
          <Toggle value={previewConfig.animated} onChange={(value) => update({ animated: value })} testID="toggle-bg-animated" />
        </View>
        <View style={styles.toggleRow}>
          <AppText variant="sm" weight="600">
            {t('backgrounds.parallax')}
          </AppText>
          <Toggle value={previewConfig.parallax} onChange={(value) => update({ parallax: value })} testID="toggle-bg-parallax" />
        </View>
        <Button
          label={t('backgrounds.reset')}
          variant="ghost"
          onPress={() => customizationActions.setBackground(target, createDefaultBackground())}
          testID="bg-reset"
        />
      </Card>

      <ModalSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('backgrounds.fromLibrary')}
        presentation="sheet"
        testID="background-picker"
      >
        {library.assets.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {library.assets.map((asset) => (
              <Pressable
                key={asset.id}
                testID={`bg-asset-${asset.id}`}
                accessibilityRole="button"
                onPress={() => {
                  update({ assetId: asset.id, uri: undefined, isGif: asset.kind === 'gif' });
                  setPickerOpen(false);
                }}
                style={[
                  styles.assetThumb,
                  { borderColor: config.assetId === asset.id ? theme.colors.primary : theme.colors.cardBorder, borderRadius: theme.shapes.radius.sm },
                ]}
              >
                <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <AppText variant="sm" tone="muted">
            {t('backgrounds.emptyLibrary')}
          </AppText>
        )}
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  card: { marginHorizontal: 16, marginTop: 12, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { height: 180, overflow: 'hidden', borderWidth: 1 },
  previewContent: { position: 'absolute', left: 14, bottom: 14, gap: 2 },
  overlaySwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  assetThumb: { width: 84, height: 84, borderWidth: 2, marginRight: 8, overflow: 'hidden' },
});
