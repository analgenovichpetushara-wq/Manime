import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { useText } from '@/i18n/useText';

/** In-app summary of what the app is allowed to do (kept short and honest). */
export function DetailsReadmeScreen() {
  const { t } = useText();
  return (
    <Screen scrollable testID="about-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('about.title')}
        </AppText>
      </View>
      <Card style={styles.card}>
        <AppText variant="sm">{t('about.body')}</AppText>
      </Card>
      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('about.sources')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('about.sourcesBody')}
        </AppText>
      </Card>
      <Card style={styles.card}>
        <AppText variant="sm" weight="700">
          {t('about.privacy')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('about.privacyBody')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8 },
  card: { marginHorizontal: 16, marginTop: 14, gap: 6 },
});
