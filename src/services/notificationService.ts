import { Platform } from 'react-native';
import type { AchievementState } from '@/data/models/achievements';
import { createLogger } from '@/core/logging/logger';
import { useSettingsStore } from '@/store/settingsStore';

const log = createLogger('notifications');

/**
 * Lightweight in-app notification sink.
 * Remote push notifications are opt-in and require a backend; the app never
 * pretends to send push messages it cannot deliver.
 */
export interface AppNotification {
  id: string;
  titleKey: string;
  bodyParams?: Record<string, string | number>;
  createdAt: number;
}

const listeners = new Set<(notification: AppNotification) => void>();
const queue: AppNotification[] = [];

export function subscribeToNotifications(listener: (notification: AppNotification) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notificationsEnabled(): boolean {
  return useSettingsStore.getState().notificationsEnabled;
}

export function notify(notification: Omit<AppNotification, 'id' | 'createdAt'>): void {
  if (!notificationsEnabled()) return;
  const payload: AppNotification = {
    ...notification,
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  queue.push(payload);
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      log.warn('listener failed', { error: String(error) });
    }
  });
}

export function notifyAchievementUnlocked(state: AchievementState, title: string): void {
  notify({ titleKey: 'notifications.achievementUnlocked', bodyParams: { name: title } });
}

export function notifyNewEpisode(title: string, ordinal: number): void {
  notify({ titleKey: 'notifications.newEpisode', bodyParams: { title, ordinal } });
}

export function pendingNotifications(): AppNotification[] {
  return [...queue];
}

export function clearNotifications(): void {
  queue.length = 0;
}

export function supportsNativePush(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}
