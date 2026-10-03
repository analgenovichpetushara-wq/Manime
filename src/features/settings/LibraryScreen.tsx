import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { EmptyView } from '@/ui/StateViews';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { libraryActions, useLibraryStore } from '@/store/collectionsStores';
import { profileActions } from '@/store/profileStore';
import { deleteLibraryAsset, libraryPreviewSource, pickAndImport } from '@/services/mediaService';
import { useAppShell } from '@/navigation/AppShell';
import { syncAchievements } from '@/services/achievementService';
import type { LibraryAsset } from '@/data/models/library';

/** Local media library: import, preview, delete, reuse as avatar/banner/background. */
export function LibraryScreen() {
  const theme = useTheme();
  const { t } = useText();
  const { showToast } = useAppShell();
  const library = useLibraryStore();
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const selected = library.assets.find((asset) => asset.id === selectedId);

  const importMedia = async (multiple: boolean) => {
    try {
      const assets = await pickAndImport(multiple);
      if (assets?.length) {
        syncAchievements();
        showToast({ titleKey: 'library.imported', params: { count: assets.length }, tone: 'accent' });
      }
    } catch {
      showToast({ titleKey: 'library.permissionDenied', tone: 'danger' });
    }
  };

  const applyAs = async (asset: LibraryAsset, usage: 'avatar' | 'banner' | 'background') => {
    const uri = await libraryPreviewSource(asset);
    if (usage === 'avatar') profileActions.setAvatar(uri, asset.kind === 'gif');
    if (usage === 'banner') profileActions.setBanner(uri, asset.kind === 'gif');
    libraryActions.markUsage(asset.id, usage, true);
    showToast({ titleKey: 'library.applied', params: { usage: t(`library.useAs${usage === 'avatar' ? 'Avatar' : usage === 'banner' ? 'Banner' : 'Background'}`) }, tone: 'accent' });
  };

  return (
    <Screen screenId="library" testID="library-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('library.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('library.originalsKept')}
        </AppText>
        <View style={styles.headerActions}>
          <Button label={t('library.import')} onPress={() => void importMedia(true)} testID="import-media" />
          <Button label={t('common.delete')} variant="ghost" disabled={!selected} onPress={async () => {
            if (!selected) return;
            await deleteLibraryAsset(selected.id);
            libraryActions.removeAsset(selected.id);
            setSelectedId(undefined);
            showToast({ titleKey: 'library.deleted', tone: 'danger' });
          }} testID="delete-asset" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {library.assets.length === 0 ? (
          <EmptyView title={t('library.empty')} subtitle={t('library.emptyHint')} icon="images-outline" actionLabel={t('library.import')} onAction={() => void importMedia(true)} />
        ) : (
          library.assets.map((asset) => (
            <Pressable
              key={asset.id}
              testID={`asset-${asset.id}`}
              onPress={() => setSelectedId(asset.id === selectedId ? undefined : asset.id)}
              style={[
                styles.asset,
                { borderColor: selectedId === asset.id ? theme.colors.primary : theme.colors.cardBorder, borderRadius: theme.shapes.radius.md },
              ]}
            >
              <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {asset.kind === 'gif' ? (
                <View style={[styles.gifBadge, { backgroundColor: theme.colors.accent }]}>
                  <AppText variant="xs" weight="700" style={{ color: theme.colors.accentText }}>
                    {t('library.gifBadge')}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      {selected ? (
        <Card style={styles.details}>
          <View style={styles.detailsRow}>
            <Image source={{ uri: selected.uri }} style={[styles.preview, { borderRadius: theme.shapes.radius.sm }]} contentFit="cover" />
            <View style={styles.detailsText}>
              <AppText variant="sm" weight="700" numberOfLines={1}>
                {selected.name}
              </AppText>
              <AppText variant="xs" tone="muted">
                {selected.width && selected.height ? `${selected.width}×${selected.height}` : t('common.unknown')}
                {selected.sizeBytes ? ` · ${Math.round(selected.sizeBytes / 1024)} KB` : ''}
              </AppText>
              <View style={styles.chipRow}>
                {selected.usedAsAvatar ? <Chip label={t('library.useAsAvatar')} tone="primary" /> : null}
                {selected.usedAsBanner ? <Chip label={t('library.useAsBanner')} tone="primary" /> : null}
                {selected.usedAsBackground ? <Chip label={t('library.useAsBackground')} tone="primary" /> : null}
              </View>
              <View style={styles.chipRow}>
                <Chip label={t('library.useAsAvatar')} onPress={() => void applyAs(selected, 'avatar')} testID="use-avatar" />
                <Chip label={t('library.useAsBanner')} onPress={() => void applyAs(selected, 'banner')} testID="use-banner" />
                <Chip label={t('library.useAsBackground')} onPress={() => void applyAs(selected, 'background')} testID="use-background" />
              </View>
            </View>
          </View>
        </Card>
      ) : (
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          <AppText variant="xs" tone="muted">
            {t('library.tapHint')}
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  headerActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  asset: { width: 96, height: 96, overflow: 'hidden', borderWidth: 2 },
  gifBadge: { position: 'absolute', bottom: 4, right: 4, paddingHorizontal: 5, borderRadius: 4 },
  details: { marginHorizontal: 16, marginBottom: 20 },
  detailsRow: { flexDirection: 'row', gap: 12 },
  preview: { width: 64, height: 64 },
  detailsText: { flex: 1, gap: 6 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  hint: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16 },
});
