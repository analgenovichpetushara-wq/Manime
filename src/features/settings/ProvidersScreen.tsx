import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Toggle } from '@/ui/Toggle';
import { useText } from '@/i18n/useText';
import { PROVIDER_DESCRIPTORS } from '@/providers/registry';
import { settingsActions, useSettingsStore } from '@/store/settingsStore';
import { providerDiagnostics, runHealthCheck, availableProviders, isProviderUsable } from '@/services/providerService';
import type { ProviderHealth } from '@/providers/types';

interface Diagnostic {
  providerId: string;
  name: string;
  health: ProviderHealth;
  capabilities: string[];
}

/** Provider registry, capabilities, health and per-provider enable/disable. */
export function ProvidersScreen() {
  const { t } = useText();
  const settings = useSettingsStore();
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(
    async (force = false) => {
      setChecking(true);
      try {
        await runHealthCheck(force);
        setDiagnostics(await providerDiagnostics());
      } finally {
        setChecking(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => void refresh(false), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const registered = new Set(availableProviders().map((provider) => provider.id));

  return (
    <Screen scrollable testID="providers-screen">
      <View style={styles.header}>
        <AppText variant="xl" weight="800" display>
          {t('providers.title')}
        </AppText>
        <AppText variant="xs" tone="muted">
          {t('providers.subtitle')}
        </AppText>
        <Button label={t('providers.checkNow')} loading={checking} onPress={() => void refresh(true)} testID="provider-check" />
      </View>

      <View style={styles.body}>
        {PROVIDER_DESCRIPTORS.map((descriptor) => {
          const diagnostic = diagnostics.find((item) => item.providerId === descriptor.id);
          const health = diagnostic?.health;
          const disabled = settings.disabledProviderIds.includes(descriptor.id);
          const usable = isProviderUsable(descriptor.id);
          const caps = Object.entries(descriptor.capabilities)
            .filter(([, value]) => value === true)
            .map(([key]) => key);
          return (
            <Card key={descriptor.id} style={styles.card} testID={`provider-${descriptor.id}`}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <AppText variant="md" weight="700">
                    {descriptor.name}
                  </AppText>
                  <AppText variant="xs" tone="muted">
                    {descriptor.homepage}
                  </AppText>
                </View>
                <Toggle
                  value={!disabled}
                  testID={`toggle-provider-${descriptor.id}`}
                  onChange={() => settingsActions.toggleProviderDisabled(descriptor.id)}
                />
              </View>

              <View style={styles.chipRow}>
                <Chip
                  label={t(`settings.providerStatus.${health?.status ?? 'unknown'}`)}
                  tone={health?.status === 'healthy' ? 'primary' : 'default'}
                />
                <Chip label={t(`providers.role.${caps.includes('streams') ? 'streaming' : caps.includes('episodes') ? 'episodes' : 'metadata'}`)} />
                {health?.latencyMs ? <Chip label={`${health.latencyMs} ms`} /> : null}
                {!registered.has(descriptor.id) ? <Chip label={t('providers.notBuiltIn')} tone="accent" /> : null}
              </View>

              <AppText variant="xs" tone="muted">
                {t(descriptor.descriptionKey)}
              </AppText>

              {descriptor.unavailableReasonKey ? (
                <AppText variant="xs" tone="danger">
                  {t(descriptor.unavailableReasonKey)}
                </AppText>
              ) : null}

              <View style={styles.chipRow}>
                {caps.map((capability) => (
                  <Chip key={capability} label={t(`providers.capability.${capability}`)} />
                ))}
              </View>

              {health?.errorMessage ? (
                <AppText variant="xs" tone="muted" numberOfLines={2}>
                  {health.errorMessage}
                </AppText>
              ) : null}

              <AppText variant="xs" tone={usable ? 'primary' : 'danger'}>
                {usable ? t('providers.inUse') : t('providers.notInUse')}
              </AppText>
            </Card>
          );
        })}
      </View>

      <Card style={styles.legal}>
        <AppText variant="xs" tone="muted">
          {t('providers.legal')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  legal: { marginHorizontal: 16, marginTop: 16, marginBottom: 24 },
});
