import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/ui/AppText';
import { ErrorView } from '@/ui/StateViews';
import { useText } from '@/i18n/useText';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Plays a source that publishes an official embed player instead of a media
 * file (Kodik).
 *
 * This is the provider's own player, loaded from the link its API returns —
 * the documented way to consume it. AnimAlc never extracts the media URLs from
 * inside that player, so nothing protected is bypassed; the native player keeps
 * serving sources that publish real HLS/MP4 URLs.
 */
export function EmbedPlayerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'EmbedPlayer'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useText();
  const [loading, setLoading] = useState(true);

  const url = route.params?.url ?? '';
  const title = route.params?.title ?? '';
  // Only http(s) is ever handed to the web view.
  const isSafeUrl = /^https?:\/\//i.test(url);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="embed-player-screen">
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.close}
          testID="embed-close"
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <AppText numberOfLines={1} style={styles.title} testID="embed-title">
          {title || t('player.embedTitle')}
        </AppText>
        <View style={styles.close} />
      </View>

      {isSafeUrl ? (
        <View style={styles.webWrap}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
          <WebView
            source={{ uri: url }}
            style={styles.web}
            testID="embed-webview"
            originWhitelist={['http://*', 'https://*']}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        </View>
      ) : (
        <ErrorView messageKey="errors.stream_unavailable" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 44 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  webWrap: { flex: 1 },
  web: { flex: 1, backgroundColor: '#000' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
