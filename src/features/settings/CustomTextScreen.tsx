import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { availableKeys, originalText, validateOverride } from '@/i18n/textEngine';
import { textActions, useTextStore } from '@/store/textStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppShell } from '@/navigation/AppShell';
import { syncAchievements } from '@/services/achievementService';
import type { AppLanguage } from '@/data/models/settings';

/** Frequently edited areas first; every other catalogue prefix is appended automatically. */
const GROUP_ORDER = ['app', 'nav', 'home', 'search', 'details', 'player', 'settings', 'profile', 'achievements', 'lists', 'banners', 'library', 'watchTogether'];

function groupsFromKeys(keys: string[]): string[] {
  const prefixes = new Set(keys.map((key) => key.split('.')[0] ?? ''));
  const ordered = GROUP_ORDER.filter((prefix) => prefixes.has(prefix));
  const rest = [...prefixes].filter((prefix) => !GROUP_ORDER.includes(prefix) && prefix.length > 0).sort();
  return [...ordered, ...rest];
}

/** Editor for the string catalogue: stable ids, per-language overrides, placeholder safety. */
export function CustomTextScreen() {
  const theme = useTheme();
  const { t } = useText();
  const { showToast } = useAppShell();
  const textState = useTextStore();
  const settings = useSettingsStore();
  const language: AppLanguage = settings.language;
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('app');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const keys = useMemo(() => availableKeys(language), [language]);
  // Any dictionary prefix becomes an editable group, so no string is unreachable.
  const groups = useMemo(() => groupsFromKeys(keys), [keys]);
  const activeGroup = groups.includes(group) ? group : groups[0] ?? 'app';
  const filtered = useMemo(
    () =>
      keys.filter(
        (key) =>
          key.startsWith(`${activeGroup}.`) &&
          (query.trim().length === 0 || key.toLowerCase().includes(query.toLowerCase()) || originalText(key, language).toLowerCase().includes(query.toLowerCase())),
      ),
    [keys, activeGroup, query, language],
  );

  const overridden = Object.keys(textState.overrides);
  const editingOriginal = editingKey ? originalText(editingKey, language) : '';
  const validation = editingKey ? validateOverride(editingOriginal, draft) : { valid: true, missing: [] as string[] };

  return (
    <Screen testID="custom-text-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('text.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('text.subtitle')}
        </AppText>
        <AppText variant="xs" tone="primary">
          {t('text.overridden', { count: overridden.length })}
        </AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('text.search')}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}
          testID="text-search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups}>
          {groups.map((item) => (
            <Chip key={item} label={t(`text.group.${item}`)} selected={activeGroup === item} onPress={() => setGroup(item)} testID={`text-group-${item}`} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.map((key) => {
          const override = textState.overrides[key]?.[language];
          return (
            <Pressable
              key={key}
              testID={`text-row-${key}`}
              onPress={() => {
                setEditingKey(key);
                setDraft(override ?? '');
              }}
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: override ? theme.colors.primary : theme.colors.cardBorder,
                  borderRadius: theme.shapes.radius.md,
                },
              ]}
            >
              <AppText variant="xs" tone="muted" numberOfLines={1}>
                {key}
              </AppText>
              <AppText variant="sm" numberOfLines={2}>
                {override ?? originalText(key, language)}
              </AppText>
              {override ? (
                <View style={styles.overrideTag}>
                  <Ionicons name="create-outline" size={12} color={theme.colors.primary} />
                  <AppText variant="xs" tone="primary">
                    {t('text.overriddenLabel')}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <AppText variant="sm" tone="muted" center>
            {t('text.noMatches')}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('text.resetAll')}
          variant="secondary"
          testID="text-reset-all"
          onPress={() => {
            textActions.resetAll();
            showToast({ titleKey: 'text.saved', tone: 'accent' });
          }}
        />
      </View>

      <ModalSheet visible={Boolean(editingKey)} onClose={() => setEditingKey(null)} title={editingKey ?? ''} testID="text-editor">
        <Card>
          <AppText variant="xs" tone="muted">
            {t('text.original')}
          </AppText>
          <AppText variant="sm">{editingOriginal}</AppText>
        </Card>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('text.custom')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[styles.input, styles.multiline, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}
          testID="text-editor-input"
        />
        {!validation.valid ? (
          <AppText variant="xs" tone="danger">
            {t('text.placeholdersHint', { placeholders: validation.missing.join(', ') })}
          </AppText>
        ) : null}
        <AppText variant="xs" tone="muted">
          {t('text.imagesUntouched')}
        </AppText>
        <Button
          label={t('common.save')}
          disabled={!validation.valid}
          testID="text-save"
          onPress={() => {
            if (!editingKey) return;
            textActions.setText(editingKey, language, draft);
            syncAchievements();
            setEditingKey(null);
            showToast({ titleKey: 'text.saved', tone: 'accent' });
          }}
        />
        <Button
          label={t('text.resetOne')}
          variant="ghost"
          onPress={() => {
            if (!editingKey) return;
            textActions.resetText(editingKey);
            setEditingKey(null);
          }}
        />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, marginTop: 4 },
  multiline: { minHeight: 96 },
  groups: { gap: 8, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingTop: 10, gap: 8, paddingBottom: 100 },
  row: { padding: 12, gap: 4, borderWidth: 1 },
  overrideTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { position: 'absolute', bottom: 16, left: 16, right: 16 },
});
