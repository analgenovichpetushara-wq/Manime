import React, { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { Screen } from '@/ui/Screen';
import { EmptyView } from '@/ui/StateViews';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { bannerActions, useBannersStore, useLibraryStore } from '@/store/collectionsStores';
import { pickAndImport, libraryPreviewSource } from '@/services/mediaService';
import { syncAchievements } from '@/services/achievementService';
import { useAppShell } from '@/navigation/AppShell';
import type { BannerAlignment, BannerOverlay, HomeBanner } from '@/data/models/banner';

const ALIGNMENTS: BannerAlignment[] = ['left', 'center', 'right'];
const OVERLAYS: BannerOverlay[] = ['none', 'dark', 'gradient', 'blur'];

/** Create / edit / reorder / enable / preview home banners. Text never touches the image file. */
export function BannerStudioScreen() {
  const theme = useTheme();
  const { t } = useText();
  const { showToast } = useAppShell();
  const state = useBannersStore();
  const library = useLibraryStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<HomeBanner>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);

  const ordered = useMemo(() => [...state.banners].sort((a, b) => a.order - b.order), [state.banners]);

  const openEditor = (banner?: HomeBanner) => {
    if (banner) {
      setEditingId(banner.id);
      setDraft({ ...banner });
      return;
    }
    setEditingId('new');
    setDraft({ title: '', subtitle: '', body: '', alignment: 'left', overlay: 'gradient', enabled: true, isGif: false });
  };

  const save = () => {
    if (editingId === 'new') bannerActions.createBanner(draft);
    else if (editingId) bannerActions.updateBanner(editingId, draft);
    setEditingId(null);
    setDraft({});
    syncAchievements();
    showToast({ titleKey: 'banners.saved', tone: 'accent' });
  };

  return (
    <Screen screenId="settings" testID="banner-studio-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('banners.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('banners.imagesSeparate')}
        </AppText>
        <Button label={t('banners.create')} onPress={() => openEditor()} testID="create-banner" />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {ordered.length === 0 ? (
          <EmptyView title={t('banners.empty')} subtitle={t('banners.emptyHint')} icon="image-outline" />
        ) : (
          ordered.map((banner, index) => (
            <Card key={banner.id} style={styles.bannerCard} testID={`banner-card-${banner.id}`}>
              <View style={styles.bannerRow}>
                <View style={[styles.thumb, { borderRadius: theme.shapes.radius.sm, backgroundColor: theme.colors.surfaceAlt }]}>
                  {banner.imageUri ? <Image source={{ uri: banner.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                </View>
                <View style={styles.bannerText}>
                  <AppText variant="sm" weight="700" numberOfLines={1}>
                    {banner.title || t('banners.untitled')}
                  </AppText>
                  <AppText variant="xs" tone="muted" numberOfLines={1}>
                    {banner.subtitle ?? ''}
                  </AppText>
                  <View style={styles.chipRow}>
                    <Chip label={t(`banners.overlay.${banner.overlay}`)} />
                    <Chip label={t(`banners.align.${banner.alignment}`)} />
                    <Chip label={banner.enabled ? t('common.enabled') : t('common.disabled')} tone={banner.enabled ? 'primary' : 'default'} />
                    {banner.isGif ? <Chip label={t('library.gifBadge')} tone="accent" /> : null}
                  </View>
                </View>
                <View style={styles.bannerActions}>
                  <IconAction icon="chevron-up" disabled={index === 0} onPress={() => bannerActions.moveBanner(banner.id, -1)} testID={`banner-up-${banner.id}`} />
                  <IconAction
                    icon="chevron-down"
                    disabled={index === ordered.length - 1}
                    onPress={() => bannerActions.moveBanner(banner.id, 1)}
                    testID={`banner-down-${banner.id}`}
                  />
                </View>
              </View>
              <View style={styles.buttonRow}>
                <Button label={t('common.edit')} size="sm" variant="secondary" onPress={() => openEditor(banner)} testID={`banner-edit-${banner.id}`} />
                <Button label={t('common.preview')} size="sm" variant="ghost" onPress={() => setPreviewId(banner.id)} testID={`banner-preview-${banner.id}`} />
                <Button label={banner.enabled ? t('common.off') : t('common.on')} size="sm" variant="ghost" onPress={() => bannerActions.toggleBanner(banner.id)} />
                <Button
                  label={t('common.delete')}
                  size="sm"
                  variant="ghost"
                  testID={`banner-delete-${banner.id}`}
                  onPress={() => {
                    bannerActions.deleteBanner(banner.id);
                    showToast({ titleKey: 'banners.deleted', tone: 'danger' });
                  }}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <ModalSheet
        visible={Boolean(editingId)}
        onClose={() => setEditingId(null)}
        title={editingId === 'new' ? t('banners.create') : t('banners.edit')}
        testID="banner-editor"
      >
        <Field label={t('banners.titleField')} value={draft.title ?? ''} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} testID="banner-title" />
        <Field label={t('banners.subtitleField')} value={draft.subtitle ?? ''} onChange={(value) => setDraft((current) => ({ ...current, subtitle: value }))} testID="banner-subtitle" />
        <Field label={t('banners.bodyField')} value={draft.body ?? ''} onChange={(value) => setDraft((current) => ({ ...current, body: value }))} multiline testID="banner-body" />
        <Field
          label={t('banners.actionLabel')}
          value={draft.action?.label ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, action: { ...(current.action ?? { type: 'none' }), label: value } }))}
          testID="banner-action"
        />
        <Field
          label={t('banners.actionTarget')}
          value={draft.action?.target ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, action: { type: 'openTitle', target: value, label: current.action?.label } }))}
          testID="banner-target"
        />

        <AppText variant="sm" weight="700">
          {t('banners.alignment')}
        </AppText>
        <View style={styles.chipRow}>
          {ALIGNMENTS.map((value) => (
            <Chip key={value} label={t(`banners.align.${value}`)} selected={draft.alignment === value} onPress={() => setDraft((current) => ({ ...current, alignment: value }))} />
          ))}
        </View>

        <AppText variant="sm" weight="700">
          {t('banners.overlay')}
        </AppText>
        <View style={styles.chipRow}>
          {OVERLAYS.map((value) => (
            <Chip key={value} label={t(`banners.overlay.${value}`)} selected={draft.overlay === value} onPress={() => setDraft((current) => ({ ...current, overlay: value }))} />
          ))}
        </View>

        <View style={styles.switchRow}>
          <AppText variant="sm" weight="600">
            {t('banners.enabled')}
          </AppText>
          <Switch value={draft.enabled ?? true} onValueChange={(value) => setDraft((current) => ({ ...current, enabled: value }))} />
        </View>

        <AppText variant="sm" weight="700">
          {t('banners.image')}
        </AppText>
        <View style={styles.chipRow}>
          <Button
            label={t('banners.pickFromGallery')}
            size="sm"
            variant="secondary"
            testID="banner-pick-gallery"
            onPress={async () => {
              try {
                const assets = await pickAndImport();
                const asset = assets?.[0];
                if (asset) {
                  const uri = await libraryPreviewSource(asset);
                  setDraft((current) => ({ ...current, imageUri: uri, assetId: asset.id, isGif: asset.kind === 'gif' }));
                }
              } catch {
                showToast({ titleKey: 'library.permissionDenied', tone: 'danger' });
              }
            }}
          />
        </View>

        {library.assets.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libraryRow}>
            {library.assets.map((asset) => (
              <Pressable
                key={asset.id}
                testID={`banner-asset-${asset.id}`}
                onPress={() => setDraft((current) => ({ ...current, imageUri: asset.uri, assetId: asset.id, isGif: asset.kind === 'gif' }))}
                style={[
                  styles.libraryItem,
                  { borderColor: draft.assetId === asset.id ? theme.colors.primary : theme.colors.cardBorder, borderRadius: theme.shapes.radius.sm },
                ]}
              >
                <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <BannerPreview banner={{ ...draft, id: editingId ?? 'preview', createdAt: 0, updatedAt: 0, order: 0, isGif: draft.isGif ?? false }} />
        <Button label={t('common.save')} onPress={save} testID="save-banner" />
      </ModalSheet>

      <ModalSheet visible={Boolean(previewId)} onClose={() => setPreviewId(null)} title={t('banners.preview')} presentation="sheet" testID="banner-preview">
        {(() => {
          const banner = ordered.find((item) => item.id === previewId);
          return banner ? <BannerPreview banner={banner} tall /> : null;
        })()}
      </ModalSheet>
    </Screen>
  );
}

function BannerPreview({ banner, tall }: { banner: Partial<HomeBanner>; tall?: boolean }) {
  const theme = useTheme();
  const { t } = useText();
  const align = banner.alignment === 'center' ? 'center' : banner.alignment === 'right' ? 'flex-end' : 'flex-start';
  return (
    <View
      style={[
        styles.preview,
        {
          height: tall ? 200 : 150,
          borderRadius: theme.shapes.radius.md,
          backgroundColor: banner.backgroundColor ?? theme.colors.surfaceAlt,
          alignItems: align,
        },
      ]}
      testID="banner-preview-surface"
    >
      {banner.imageUri ? <Image source={{ uri: banner.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      {banner.overlay && banner.overlay !== 'none' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                banner.overlay === 'gradient' ? 'rgba(0,0,0,0.45)' : banner.overlay === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.25)',
            },
          ]}
        />
      ) : null}
      <View style={[styles.previewText, { alignItems: align }]}>
        <AppText variant="lg" weight="800" display style={{ color: banner.textColor ?? '#fff' }} center={banner.alignment === 'center'}>
          {banner.title || t('banners.titleField')}
        </AppText>
        <AppText variant="sm" style={{ color: banner.textColor ?? '#ececec' }} center={banner.alignment === 'center'}>
          {banner.subtitle ?? ''}
        </AppText>
        <AppText variant="xs" style={{ color: banner.textColor ?? '#d0d0d0' }} center={banner.alignment === 'center'}>
          {banner.body ?? ''}
        </AppText>
        {banner.action?.label ? (
          <View style={[styles.previewButton, { backgroundColor: theme.colors.primary, borderRadius: theme.shapes.radius.pill }]}>
            <AppText variant="xs" weight="700" style={{ color: theme.colors.primaryText }}>
              {banner.action.label}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  testID,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <AppText variant="xs" tone="muted">
        {label}
      </AppText>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md, minHeight: multiline ? 72 : 42 },
        ]}
      />
    </View>
  );
}

function IconAction({
  icon,
  onPress,
  disabled,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      style={[styles.iconAction, { backgroundColor: theme.colors.chipBackground, borderRadius: theme.shapes.radius.sm, opacity: disabled ? 0.4 : 1 }]}
    >
      <Ionicons name={icon} size={14} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  list: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 60 },
  bannerCard: { gap: 10 },
  bannerRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 72, height: 48, overflow: 'hidden' },
  bannerText: { flex: 1, gap: 4 },
  bannerActions: { gap: 6 },
  iconAction: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  field: { gap: 6 },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  libraryRow: { gap: 10 },
  libraryItem: { width: 56, height: 56, overflow: 'hidden', borderWidth: 2 },
  preview: { overflow: 'hidden', justifyContent: 'center', padding: 14 },
  previewText: { gap: 4 },
  previewButton: { paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
});
