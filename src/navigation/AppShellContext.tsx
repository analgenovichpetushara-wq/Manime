import { createContext, useContext } from 'react';
import type { AnimeTitle } from '@/data/models/anime';
import type { ToastMessage } from '@/ui/Toast';

export interface AppShellValue {
  openTitle: (title: AnimeTitle) => void;
  closeTitle: () => void;
  showToast: (message: Omit<ToastMessage, 'id'>) => void;
  activeTitle: AnimeTitle | null;
}

export const AppShellContext = createContext<AppShellValue | null>(null);

export function useAppShell(): AppShellValue {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShell must be used inside AppShell');
  }
  return context;
}
