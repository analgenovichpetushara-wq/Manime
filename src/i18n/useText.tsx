import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { AppLanguage } from '@/data/models/settings';
import { translate, type TextOverrides } from '@/i18n/textEngine';

export interface TextContextValue {
  language: AppLanguage;
  overrides: TextOverrides;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const TextContext = createContext<TextContextValue | null>(null);

export function TextProvider({
  language,
  overrides,
  children,
}: {
  language: AppLanguage;
  overrides: TextOverrides;
  children: React.ReactNode;
}) {
  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>) => translate(key, language, overrides, replacements),
    [language, overrides],
  );
  const value = useMemo<TextContextValue>(() => ({ language, overrides, t }), [language, overrides, t]);
  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

export function useText(): TextContextValue {
  const context = useContext(TextContext);
  if (!context) {
    // Safe fallback: keeps components usable in isolation (tests, stories).
    return {
      language: 'ru',
      overrides: {},
      t: (key: string, replacements?: Record<string, string | number>) => translate(key, 'ru', {}, replacements),
    };
  }
  return context;
}

export function useT() {
  return useText().t;
}
