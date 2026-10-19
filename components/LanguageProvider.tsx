'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../lib/i18n.mjs';
export type Language = 'zh-CN' | 'ja';
const STORAGE_KEY = 'momiji-language-v1';
type I18n = { language: Language; setLanguage: (language: Language) => void; ready: boolean; t: (key: string, values?: Record<string, string | number>) => string };
const LanguageContext = createContext<I18n | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Match the server HTML on initial render, then restore the saved preference.
  const [language, setCurrentLanguage] = useState<Language>('zh-CN');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(STORAGE_KEY) === 'ja') setCurrentLanguage('ja'); } catch { /* Language switching still works without storage. */ }
    setReady(true);
    function sync(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setCurrentLanguage(event.newValue === 'ja' ? 'ja' : 'zh-CN');
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Do not block the interface if storage is disabled. */ }
  }, []);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('モミジイ · 红叶旅行清单');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('把想去的秋天，慢慢变成去过的风景。日本红叶景点清单与地图。'));
  }, [language, t]);
  const value = useMemo(() => ({ language, setLanguage, ready, t }), [language, setLanguage, ready, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used within LanguageProvider');
  return context;
}
export function LanguageSwitcher() {
  const { language, setLanguage, ready, t } = useI18n();
  return <select className="language-switcher" aria-label={t('语言')} value={language} disabled={!ready} onChange={e => setLanguage(e.target.value as Language)}><option value="zh-CN" lang="zh-CN">简体中文</option><option value="ja" lang="ja">日本語</option></select>;
}
