import { useCallback, useRef } from 'react';
import { notifyAchievementUnlocked } from '@/services/notificationService';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';
import { translate } from '@/i18n/textEngine';
import { useSettingsStore } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import type { ToastMessage } from '@/ui/Toast';
import { useAppShell } from './AppShellContext';

export function announceAchievement(id: string, showToast: (message: Omit<ToastMessage, 'id'>) => void): void {
  const definition = ACHIEVEMENTS.find((item) => item.id === id);
  if (!definition) return;
  const settings = useSettingsStore.getState();
  const { overrides } = useTextStore.getState();
  const title = translate(definition.titleKey, settings.language, overrides);
  showToast({ titleKey: 'achievements.newUnlock', params: { name: title }, tone: 'accent' });
  notifyAchievementUnlocked(
    { id, progress: definition.target, target: definition.target, unlocked: true },
    title,
  );
}

export function useAchievementAnnouncer() {
  const { showToast } = useAppShell();
  const pending = useRef<string[]>([]);
  return useCallback(
    (ids: string[]) => {
      const fresh = ids.filter((id) => !pending.current.includes(id));
      pending.current = [...pending.current, ...fresh].slice(-50);
      fresh.forEach((id) => announceAchievement(id, showToast));
    },
    [showToast],
  );
}
