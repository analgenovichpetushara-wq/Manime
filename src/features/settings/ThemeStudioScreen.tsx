import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { Screen } from '@/ui/Screen';
import { Stepper } from '@/ui/Stepper';
import { useText } from '@/i18n/useText';
import { useTheme } from '@/theme/ThemeProvider';
import { customizationActions, useCustomizationStore } from '@/store/customizationStore';
import { themeActions, useThemeStore } from '@/store/themeStore';
import { settingsActions } from '@/store/settingsStore';
import { syncAchievements } from '@/services/achievementService';
import { CARD_STYLES, isCardStyleId, type CardStyleId } from '@/theme/cardStyles';
import { NAV_STYLES, isNavStyleId, type NavStyleId } from '@/theme/navStyles';
import { THEME_PRESETS } from '@/theme/presets';
import { customThemeTokenCount, exportCustomTheme, importCustomTheme } from '@/theme/customThemes';
import type { ThemeColors } from '@/theme/themeTypes';

const COLOR_FIELDS: { key: keyof ThemeColors; labelKey: string }[] = [
  { key: 'primary', labelKey: 'themeStudio.color.primary' },
  { key: 'secondary', labelKey: 'themeStudio.color.secondary' },
  { key: 'accent', labelKey: 'themeStudio.color.accent' },
  { key: 'background', labelKey: 'themeStudio.color.background' },
  { key: 'card', labelKey: 'themeStudio.color.card' },
  { key: 'cardBorder', labelKey: 'themeStudio.color.border' },
  { key: 'text', labelKey: 'themeStudio.color.text' },
  { key: 'textMuted', labelKey: 'themeStudio.color.textMuted' },
  { key: 'navBackground', labelKey: 'themeStudio.color.nav' },
];

const RADIUS_OPTIONS = [0, 4, 8, 12, 16, 24, 32];

export function ThemeStudioScreen() {
  const { t } = useText();
  const theme = useTheme();
  const customization = useCustomizationStore();
  const themeStore = useThemeStore();
  const [editorId, setEditorId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [baseDraft, setBaseDraft] = useState(THEME_PRESETS[0]!.id);
  const [exported, setExported] = useState<string | null>(null);
  const [importDraft, setImportDraft] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const editing = useMemo(
    () => customization.customThemes.find((item) => item.id === editorId) ?? null,
    [customization.customThemes, editorId],
  );

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  };

  const applyTheme = (id: string) => {
    themeActions.setPresetId(id);
    settingsActions.setThemePreset(id);
    syncAchievements();
    flash(t('themeStudio.applied'));
  };

  const createTheme = () => {
    const id = customizationActions.addCustomTheme(nameDraft || t('themeStudio.untitled'), baseDraft);
    setNameDraft('');
    setEditorId(id);
  };

  const patchColor = (themeId: string, mode: 'light' | 'dark', key: keyof ThemeColors, value: string) => {
    const target = customization.customThemes.find((item) => item.id === themeId);
    if (!target) return;
    const palette = { ...(target.colors[mode] ?? {}), [key]: value };
    customizationActions.updateCustomTheme(themeId, { colors: { ...target.colors, [mode]: palette } });
  };

  const doImport = () => {
    const result = importCustomTheme(importDraft);
    if (!result.ok) {
      setImportError(t(`themeStudio.importError.${result.error}`));
      return;
    }
    const id = customizationActions.importTheme(result.theme);
    setImportError(null);
    setImportOpen(false);
    setImportDraft('');
    setEditorId(id);
    flash(t('themeStudio.imported'));
  };

  const editingColors = editing ? (editing.colors[theme.mode === 'dark' ? 'dark' : 'light'] ?? {}) : {};

  return (
    <Screen scrollable screenId="settings" testID="theme-studio-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('themeStudio.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('themeStudio.subtitle')}
        </AppText>
      </View>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('cardStyle.title')}
        </AppText>
        <View style={styles.row}>
          {CARD_STYLES.map((style) => (
            <Chip
              key={style.id}
              label={t(style.nameKey)}
              selected={customization.cardStyleId === style.id}
              onPress={() => customizationActions.setCardStyleId(style.id as CardStyleId)}
              testID={`card-style-${style.id}`}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('navStyle.title')}
        </AppText>
        <View style={styles.row}>
          {NAV_STYLES.map((style) => (
            <Chip
              key={style.id}
              label={t(style.nameKey)}
              selected={customization.navStyleId === style.id}
              onPress={() => customizationActions.setNavStyleId(style.id as NavStyleId)}
              testID={`nav-style-${style.id}`}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('themeStudio.myThemes')}
        </AppText>
        {customization.customThemes.length ? (
          customization.customThemes.map((customTheme) => (
            <View key={customTheme.id} style={[styles.themeRow, { borderColor: theme.colors.cardBorder }]} testID={`theme-${customTheme.id}`}>
              <View style={styles.themeInfo}>
                <AppText variant="sm" weight="700">
                  {customTheme.name}
                </AppText>
                <AppText variant="xs" tone="muted">
                  {t('themeStudio.tokenCount', { count: customThemeTokenCount(customTheme) })}
                  {customization.defaultCustomThemeId === customTheme.id ? ` · ${t('themeStudio.isDefault')}` : ''}
                </AppText>
              </View>
              <View style={styles.row}>
                <Chip label={t('themeStudio.apply')} selected={themeStore.presetId === customTheme.id} onPress={() => applyTheme(customTheme.id)} />
                <Chip label={t('themeStudio.edit')} onPress={() => setEditorId(customTheme.id)} />
                <Chip label={t('themeStudio.duplicate')} onPress={() => customizationActions.duplicateTheme(customTheme.id)} />
                <Chip
                  label={t('themeStudio.export')}
                  onPress={async () => {
                    const payload = exportCustomTheme(customTheme);
                    await Clipboard.setStringAsync(payload);
                    setExported(payload);
                  }}
                />
                <Chip
                  label={t('themeStudio.setDefault')}
                  selected={customization.defaultCustomThemeId === customTheme.id}
                  onPress={() => {
                    customizationActions.setDefaultTheme(customTheme.id);
                    applyTheme(customTheme.id);
                  }}
                />
                <Chip
                  label={t('themeStudio.delete')}
                  onPress={() => {
                    customizationActions.deleteTheme(customTheme.id);
                    if (themeStore.presetId === customTheme.id) applyTheme(THEME_PRESETS[0]!.id);
                  }}
                />
              </View>
            </View>
          ))
        ) : (
          <AppText variant="xs" tone="muted">
            {t('themeStudio.empty')}
          </AppText>
        )}

        <View style={styles.row}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder={t('themeStudio.namePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { borderColor: theme.colors.cardBorder, color: theme.colors.text, borderRadius: theme.shapes.radius.md }]}
            testID="theme-name-input"
          />
        </View>
        <View style={styles.row}>
          {THEME_PRESETS.map((preset) => (
            <Chip key={preset.id} label={t(preset.nameKey)} selected={baseDraft === preset.id} onPress={() => setBaseDraft(preset.id)} />
          ))}
        </View>
        <View style={styles.row}>
          <Button label={t('themeStudio.create')} onPress={createTheme} testID="theme-create" />
          <Button label={t('themeStudio.import')} variant="secondary" onPress={() => setImportOpen(true)} testID="theme-import" />
          <Button label={t('themeStudio.reset')} variant="ghost" onPress={() => customizationActions.resetAll()} testID="theme-reset-all" />
        </View>
        {toast ? (
          <AppText variant="xs" style={{ color: theme.colors.success }}>
            {toast}
          </AppText>
        ) : null}
      </Card>

      <ModalSheet
        visible={Boolean(editing)}
        onClose={() => setEditorId(null)}
        title={editing?.name}
        testID="theme-editor"
      >
        {editing ? (
          <View style={styles.editor}>
            <View style={styles.row}>
              <TextInput
                value={editing.name}
                onChangeText={(value) => customizationActions.renameTheme(editing.id, value)}
                style={[styles.input, { borderColor: theme.colors.cardBorder, color: theme.colors.text, borderRadius: theme.shapes.radius.md }]}
                testID="theme-rename-input"
              />
            </View>
            <Stepper
              testID="theme-radius"
              label={t('themeStudio.radius')}
              value={editing.shapes?.radius?.md ?? 0}
              options={RADIUS_OPTIONS.map((value) => ({ value, label: String(value) }))}
              onChange={(value) =>
                customizationActions.updateCustomTheme(editing.id, {
                  shapes: { ...editing.shapes, radius: { ...editing.shapes?.radius, md: value, lg: value + 6, sm: Math.max(0, value - 4) } },
                })
              }
            />
            <Stepper
              testID="theme-border-width"
              label={t('themeStudio.borderWidth')}
              value={editing.shapes?.borderWidth ?? 0}
              options={[0, 1, 2, 3].map((value) => ({ value, label: String(value) }))}
              onChange={(value) => customizationActions.updateCustomTheme(editing.id, { shapes: { ...editing.shapes, borderWidth: value } })}
            />
            <Stepper
              testID="theme-card-style"
              label={t('cardStyle.title')}
              value={editing.cardStyleId ?? customization.cardStyleId}
              options={CARD_STYLES.filter((style) => isCardStyleId(style.id)).map((style) => ({ value: style.id, label: t(style.nameKey) }))}
              onChange={(value) => customizationActions.updateCustomTheme(editing.id, { cardStyleId: value })}
            />
            <Stepper
              testID="theme-nav-style"
              label={t('navStyle.title')}
              value={editing.navStyleId ?? customization.navStyleId}
              options={NAV_STYLES.filter((style) => isNavStyleId(style.id)).map((style) => ({ value: style.id, label: t(style.nameKey) }))}
              onChange={(value) => customizationActions.updateCustomTheme(editing.id, { navStyleId: value })}
            />
            <AppText variant="xs" tone="muted">
              {t('themeStudio.colorMode', { mode: theme.mode })}
            </AppText>
            {COLOR_FIELDS.map((field) => (
              <View key={field.key} style={styles.colorRow}>
                <AppText variant="xs" style={styles.colorLabel}>
                  {t(field.labelKey)}
                </AppText>
                <TextInput
                  value={(editingColors[field.key] as string) ?? ''}
                  onChangeText={(value) => patchColor(editing.id, theme.mode === 'dark' ? 'dark' : 'light', field.key, value)}
                  placeholder="#RRGGBB"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  style={[styles.colorInput, { borderColor: theme.colors.cardBorder, color: theme.colors.text, borderRadius: theme.shapes.radius.sm }]}
                  testID={`theme-color-${field.key}`}
                />
              </View>
            ))}
            <View style={styles.row}>
              <Button label={t('themeStudio.apply')} onPress={() => applyTheme(editing.id)} testID="theme-apply" />
              <Button label={t('themeStudio.done')} variant="secondary" onPress={() => setEditorId(null)} />
            </View>
          </View>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={Boolean(exported)}
        onClose={() => setExported(null)}
        title={t('themeStudio.export')}
        testID="theme-export"
      >
        <AppText variant="xs" tone="muted" selectable>
          {exported}
        </AppText>
      </ModalSheet>

      <ModalSheet visible={importOpen} onClose={() => setImportOpen(false)} title={t('themeStudio.import')} testID="theme-import-sheet">
        <TextInput
          value={importDraft}
          onChangeText={setImportDraft}
          multiline
          autoCapitalize="none"
          placeholder={t('themeStudio.importPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.textArea, { borderColor: theme.colors.cardBorder, color: theme.colors.text, borderRadius: theme.shapes.radius.md }]}
          testID="theme-import-input"
        />
        {importError ? (
          <AppText variant="xs" style={{ color: theme.colors.danger }}>
            {importError}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <Button label={t('themeStudio.import')} onPress={doImport} testID="theme-import-confirm" />
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setImportOpen(false)} />
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  card: { marginHorizontal: 16, marginTop: 12, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  themeRow: { borderWidth: 1, padding: 10, gap: 8, borderRadius: 8 },
  themeInfo: { gap: 2 },
  input: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, minWidth: 180, flex: 1 },
  textArea: { borderWidth: 1, padding: 10, minHeight: 140, textAlignVertical: 'top' },
  editor: { gap: 12, padding: 4 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorLabel: { width: 96 },
  colorInput: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, flex: 1 },
});
