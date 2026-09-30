import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { ModalSheet } from '@/ui/ModalSheet';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useText } from '@/i18n/useText';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { useAppShell } from '@/navigation/AppShell';
import { profileActions, useProfileStore } from '@/store/profileStore';
import { progressActions, useProgressStore } from '@/store/progressStore';
import { entriesInCategory, useListsStore } from '@/store/listsStore';
import { useAchievementsStore } from '@/store/achievementsStore';
import { useLibraryStore } from '@/store/collectionsStores';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';
import { pickAndImport, isAnimated, libraryPreviewSource } from '@/services/mediaService';
import { initials } from '@/core/utils/text';
import { formatDurationMinutes } from '@/core/utils/time';
import { syncAchievements } from '@/services/achievementService';
import type { LibraryAsset } from '@/data/models/library';

/** Discord-inspired profile: wide banner, circular avatar, live stats, editing. */
export function ProfileScreen() {
  const theme = useTheme();
  const { t } = useText();
  const navigation = useAppNavigation();
  const { showToast } = useAppShell();
  const profileState = useProfileStore();
  const progressState = useProgressStore();
  const listsState = useListsStore();
  const achievementsState = useAchievementsStore();
  const libraryState = useLibraryStore();

  const [pickerTarget, setPickerTarget] = useState<'avatar' | 'banner' | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profileState.profile.displayName);
  const [draftUsername, setDraftUsername] = useState(profileState.profile.username);
  const [draftBio, setDraftBio] = useState(profileState.profile.bio);

  useEffect(() => {
    progressActions.refreshDerived();
  }, []);

  const profile = profileState.profile;
  const favorites = useMemo(() => entriesInCategory(listsState, 'favorites').length, [listsState]);
  const unlocked = useMemo(
    () => Object.values(achievementsState.states).filter((state) => state.unlocked).length,
    [achievementsState],
  );
  const providerUsage = useMemo(
    () =>
      Object.entries(progressState.stats.providersUsed)
        .map(([providerId, episodes]) => ({ providerId, episodes }))
        .sort((a, b) => b.episodes - a.episodes),
    [progressState.stats.providersUsed],
  );

  const applyAsset = useCallback(
    async (asset: LibraryAsset, target: 'avatar' | 'banner') => {
      const uri = await libraryPreviewSource(asset);
      if (target === 'avatar') profileActions.setAvatar(uri, isAnimated(asset));
      else profileActions.setBanner(uri, isAnimated(asset));
      setPickerTarget(null);
      showToast({ titleKey: 'profile.saved', tone: 'accent' });
    },
    [showToast],
  );

  const importFromGallery = useCallback(
    async (target: 'avatar' | 'banner') => {
      try {
        const assets = await pickAndImport();
        const asset = assets?.[0];
        if (asset) await applyAsset(asset, target);
      } catch {
        showToast({ titleKey: 'library.permissionDenied', tone: 'danger' });
      }
    },
    [applyAsset, showToast],
  );

  return (
    <Screen scrollable testID="profile-screen">
      <View style={[styles.bannerWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
        {profile.bannerUri ? (
          <Image source={{ uri: profile.bannerUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
        <Pressable
          testID="change-banner"
          onPress={() => setPickerTarget('banner')}
          accessibilityRole="button"
          style={[styles.bannerButton, { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: theme.shapes.radius.pill }]}
        >
          <Ionicons name="image" size={14} color="#fff" />
          <AppText variant="xs" style={{ color: '#fff' }}>
            {t('profile.changeBanner')}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.identityRow}>
        <Pressable testID="change-avatar" onPress={() => setPickerTarget('avatar')} accessibilityRole="button">
          <View style={[styles.avatar, { borderColor: theme.colors.background, backgroundColor: theme.colors.primary }]}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <AppText variant="xl" weight="800" style={{ color: theme.colors.primaryText }}>
                {initials(profile.displayName)}
              </AppText>
            )}
          </View>
        </Pressable>
        <View style={styles.identityText}>
          <AppText variant="xl" weight="800" display numberOfLines={1}>
            {profile.displayName}
          </AppText>
          <AppText variant="sm" tone="muted">
            @{profile.username}
          </AppText>
          <AppText variant="xs" tone="muted">
            {t('profile.member', { date: new Date(profile.createdAt).toLocaleDateString() })}
          </AppText>
        </View>
      </View>

      {profile.bio ? (
        <View style={styles.bio}>
          <AppText variant="sm">{profile.bio}</AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('profile.edit')} variant="secondary" onPress={() => setEditing(true)} testID="edit-profile" />
        <Button label={t('profile.achievements')} onPress={() => navigation.navigate('Achievements')} testID="open-achievements" />
      </View>

      <View style={styles.statsGrid}>
        <StatTile icon="film" label={t('stats.episodesCompleted')} value={String(progressState.stats.episodesCompleted)} />
        <StatTile icon="checkmark-done" label={t('stats.titlesCompleted')} value={String(progressState.stats.titlesCompleted)} />
        <StatTile icon="time" label={t('stats.hoursWatched')} value={String(Math.floor(progressState.stats.secondsWatched / 3600))} />
        <StatTile icon="flame" label={t('stats.streak')} value={t('stats.days', { count: progressState.currentStreak })} />
        <StatTile icon="heart" label={t('stats.favorites')} value={String(favorites)} />
        <StatTile icon="trophy" label={t('achievements.title')} value={`${unlocked}/${ACHIEVEMENTS.length}`} />
      </View>

      <AppText variant="xs" tone="muted" style={styles.derivedNotice}>
        {t('stats.derivedNotice')}
      </AppText>

      <View style={styles.section}>
        <AppText variant="lg" weight="700" display>
          {t('stats.providerUsage')}
        </AppText>
        {providerUsage.length ? (
          providerUsage.map((usage) => (
            <Card key={usage.providerId} style={styles.usageCard}>
              <View style={styles.usageRow}>
                <AppText variant="sm" weight="600">
                  {usage.providerId}
                </AppText>
                <AppText variant="sm" tone="muted">
                  {usage.episodes} {t('common.episodes').toLowerCase()}
                </AppText>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <AppText variant="sm" tone="muted">
              {t('home.empty.subtitle')}
            </AppText>
          </Card>
        )}
        {progressState.stats.completedDates.length ? (
          <AppText variant="xs" tone="muted">
            {t('profile.weekWatchTime', {
              minutes: Math.round(
                progressState.stats.completedDates.slice(-7).length * (progressState.stats.secondsWatched / 60 / Math.max(1, progressState.stats.completedDates.length)),
              ),
            })}
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppText variant="lg" weight="700" display>
          {t('profile.customization')}
        </AppText>
        <Button label={t('settings.customize')} variant="secondary" onPress={() => navigation.navigate('Customization')} />
        <Button label={t('settings.customText')} variant="ghost" onPress={() => navigation.navigate('CustomText')} />
        <Button label={t('settings.customBanners')} variant="ghost" onPress={() => navigation.navigate('BannerStudio')} />
        <Button label={t('settings.library')} variant="ghost" onPress={() => navigation.navigate('Library')} />
      </View>

      <View style={styles.section}>
        <AppText variant="lg" weight="700" display>
          {t('achievements.recent')}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges}>
          {ACHIEVEMENTS.filter((definition) => achievementsState.states[definition.id]?.unlocked)
            .slice(0, 12)
            .map((definition) => (
              <Chip key={definition.id} label={t(definition.titleKey)} tone="accent" />
            ))}
          {unlocked === 0 ? (
            <AppText variant="xs" tone="muted">
              {t('achievements.empty')}
            </AppText>
          ) : null}
        </ScrollView>
      </View>

      <ModalSheet visible={editing} onClose={() => setEditing(false)} title={t('profile.edit')} testID="profile-editor">
        <Field label={t('profile.displayName')} value={draftName} onChange={setDraftName} testID="input-display-name" />
        <Field label={t('profile.username')} value={draftUsername} onChange={setDraftUsername} autoCapitalize="none" testID="input-username" />
        <Field label={t('profile.bio')} value={draftBio} onChange={setDraftBio} multiline placeholder={t('profile.bioPlaceholder')} testID="input-bio" />
        <Button
          label={t('common.save')}
          testID="save-profile"
          onPress={() => {
            profileActions.updateProfile({
              displayName: draftName.trim() || profile.displayName,
              username: draftUsername.trim().replace(/\s+/g, '_') || profile.username,
              bio: draftBio,
            });
            setEditing(false);
            syncAchievements();
            showToast({ titleKey: 'profile.saved', tone: 'accent' });
          }}
        />
        <Button label={t('profile.fromGallery')} variant="ghost" onPress={() => void importFromGallery('avatar')} />
      </ModalSheet>

      <ModalSheet
        visible={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget === 'avatar' ? t('profile.changeAvatar') : t('profile.changeBanner')}
        presentation="sheet"
        testID="media-picker"
      >
        <Button label={t('profile.fromGallery')} onPress={() => pickerTarget && void importFromGallery(pickerTarget)} fullWidth />
        <AppText variant="sm" weight="700">
          {t('profile.fromLibrary')}
        </AppText>
        {libraryState.assets.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.libraryRow}>
            {libraryState.assets.map((asset) => (
              <Pressable
                key={asset.id}
                testID={`pick-${asset.id}`}
                onPress={() => pickerTarget && void applyAsset(asset, pickerTarget)}
                style={[styles.libraryItem, { borderColor: theme.colors.cardBorder, borderRadius: theme.shapes.radius.md }]}
              >
                <Image source={{ uri: asset.uri }} style={styles.libraryImage} contentFit="cover" />
                {asset.kind === 'gif' ? (
                  <View style={[styles.gifBadge, { backgroundColor: theme.colors.accent }]}>
                    <AppText variant="xs" weight="700" style={{ color: theme.colors.accentText }}>
                      {t('library.gifBadge')}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <AppText variant="xs" tone="muted">
            {t('library.emptyHint')}
          </AppText>
        )}
        <Button label={t('settings.library')} variant="ghost" onPress={() => navigation.navigate('Library', { purpose: pickerTarget ?? 'avatar' })} />
        <AppText variant="xs" tone="muted">
          {t('profile.avatarHint')}
        </AppText>
      </ModalSheet>
      <AppText variant="xs" tone="muted" style={styles.footer}>
        {formatDurationMinutes(progressState.stats.secondsWatched)} · {t('stats.hoursWatched')}
      </AppText>
    </Screen>
  );
}

function StatTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const theme = useTheme();
  return (
    <Card style={styles.statTile}>
      <Ionicons name={icon} size={16} color={theme.colors.primary} />
      <AppText variant="lg" weight="800">
        {value}
      </AppText>
      <AppText variant="xs" tone="muted" numberOfLines={2}>
        {label}
      </AppText>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  autoCapitalize = 'sentences',
  testID,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences';
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
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.shapes.radius.md,
            borderColor: theme.colors.cardBorder,
            minHeight: multiline ? 84 : 44,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { height: 150, overflow: 'hidden', justifyContent: 'flex-end' },
  bannerButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  identityRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: -34, alignItems: 'flex-end' },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  identityText: { flex: 1, gap: 2, paddingBottom: 6 },
  bio: { paddingHorizontal: 16, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14, flexWrap: 'wrap' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 18 },
  statTile: { width: '31%', gap: 4, padding: 12 },
  derivedNotice: { paddingHorizontal: 16, marginTop: 8 },
  section: { paddingHorizontal: 16, marginTop: 22, gap: 10 },
  usageCard: { padding: 12 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  field: { gap: 6 },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  libraryRow: { gap: 10 },
  libraryItem: { width: 64, height: 64, overflow: 'hidden', borderWidth: 1 },
  libraryImage: { width: '100%', height: '100%' },
  gifBadge: { position: 'absolute', bottom: 2, right: 2, paddingHorizontal: 4, borderRadius: 3 },
  badges: { gap: 8 },
  footer: { paddingHorizontal: 16, marginTop: 24 },
});
