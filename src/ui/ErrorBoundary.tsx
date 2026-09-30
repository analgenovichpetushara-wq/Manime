import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { translate } from '@/i18n/textEngine';
import { useSettingsStore } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { resolveTheme } from '@/theme/themeEngine';
import { appLogger } from '@/core/logging/logger';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort guard: a rendering error inside any screen degrades to a themed
 * fallback instead of a white screen or a stack trace.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error) {
    appLogger.error('render error', { message: error.message });
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const settings = useSettingsStore.getState();
    const overrides = useTextStore.getState().overrides;
    const theme = resolveTheme({
      presetId: settings.themePresetId,
      mode: settings.mode,
      amoled: settings.amoled,
      accentColor: settings.accentColor,
      fontScale: settings.fontScale,
      reduceMotion: settings.reduceMotion,
    });
    const t = (key: string) => translate(key, settings.language, overrides);

    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]} testID="error-boundary">
        <Ionicons name="warning-outline" size={36} color={theme.colors.warning} />
        <AppText variant="lg" weight="700" center style={styles.title}>
          {t('error.boundary.title')}
        </AppText>
        <AppText variant="sm" tone="muted" center>
          {t('error.boundary.subtitle')}
        </AppText>
        <Button label={t('common.retry')} onPress={this.reset} style={styles.button} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  title: { marginTop: 4 },
  button: { marginTop: 12, minWidth: 160 },
});
