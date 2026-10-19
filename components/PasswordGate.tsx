'use client';
import { createContext, useContext, useEffect, useState, type FormEvent } from 'react';
import { Leaf, LockKeyhole, ArrowRight } from 'lucide-react';
import { ACCESS_SESSION_KEY, acceptsPassword } from '../lib/access.mjs';
import { LanguageSwitcher, useI18n } from './LanguageProvider';
const AccessContext = createContext<{ lock: () => void } | null>(null);
export function PasswordGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    try { setUnlocked(sessionStorage.getItem(ACCESS_SESSION_KEY) === 'granted'); } catch { /* In-memory access works even when browser storage is blocked. */ }
    setChecked(true);
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptsPassword(password)) { setError(true); return; }
    try { sessionStorage.setItem(ACCESS_SESSION_KEY, 'granted'); } catch { /* Unlock for this page view only. */ }
    setPassword(''); setError(false); setUnlocked(true);
  }
  function lock() {
    try { sessionStorage.removeItem(ACCESS_SESSION_KEY); } catch { /* Always lock in memory as well. */ }
    setPassword(''); setError(false); setUnlocked(false);
    window.scrollTo({ top: 0 });
  }
  if (checked && unlocked) return <AccessContext.Provider value={{ lock }}>{children}</AccessContext.Provider>;
  return <main className="access-screen"><section className="access-card" role="dialog" aria-modal="true" aria-labelledby="access-title" aria-describedby="access-description"><div className="access-language"><LanguageSwitcher /></div><span className="brand-icon access-logo"><Leaf size={30} /></span><div className="eyebrow">MOMIJII · AUTUMN JOURNAL</div><h1 id="access-title">モミジイ</h1><p id="access-description">{t('输入访问密码，开启你的秋日旅程。')}</p><form onSubmit={submit}><label htmlFor="access-password"><LockKeyhole size={14} />{t('访问密码')}</label><input id="access-password" type="password" autoComplete="current-password" autoFocus required value={password} aria-invalid={error} aria-describedby={error ? 'access-error' : undefined} onChange={event => { setPassword(event.target.value); setError(false); }} placeholder={t('请输入密码')} />{error && <p id="access-error" role="alert">{t('密码不正确，请重试。')}</p>}<button type="submit" disabled={!checked}>{t('进入モミジイ')}<ArrowRight size={16} /></button></form><p className="access-note">{t('仅为轻量访问提示，不提供真正的安全认证。')}</p></section><p className="access-footer">日本の秋を、ひとつずつ。</p></main>;
}
export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error('useAccess must be used within PasswordGate');
  return context;
}
