import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimeTitle } from '@/data/models/anime';
import { AnimeDetailsModal } from '@/features/details/AnimeDetailsModal';
import { ToastHost, type ToastMessage } from '@/ui/Toast';
import { notifyAchievementUnlocked } from '@/services/notificationService';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';
import { translate } from '@/i18n/textEngine';
import { useSettingsStore } from '@/store/settingsStore';
import { useTextStore } from '@/store/textStore';
import { useAppNavigation } from '@/navigation/useAppNavigation';
import { AppShellContext } from './AppShellContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [activeTitle, setActiveTitle] = useState<AnimeTitle | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    counter.current += 1;
    const id = `toast_${counter.current}`;
    setToasts((current) => [...current, { ...message, id }]);
    const timer = setTimeout(() => {
      timers.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
    timers.current.set(id, timer);
  }, []);

  const value = useMemo(
    () => ({
      openTitle: (title: AnimeTitle) => setActiveTitle(title),
      closeTitle: () => setActiveTitle(null),
      showToast,
      activeTitle,
    }),
    [showToast, activeTitle],
  );

  return (
    <AppShellContext.Provider value={value}>
      {children}
      <AnimeDetailsModal />
      <ToastHost messages={toasts} />
    </AppShellContext.Provider>
  );
}

/** Helper used by stores/services to display achievement notifications with the active language. */
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

export function useShellNavigation() {
  return useAppNavigation();
}

export { useAppShell } from './AppShellContext';
export { useAchievementAnnouncer } from './achievementAnnouncer';
