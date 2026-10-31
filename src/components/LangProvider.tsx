'use client';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStored } from '@/lib/storage';
import type { Lang } from '@/lib/types';

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; big: boolean; setBig: (b: boolean) => void }>({ lang: 'ur', setLang: () => {}, big: false, setBig: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useStored<Lang>('lang', 'ur');
  const [big, setBig] = useStored<boolean>('bigText', false);
  useEffect(() => { document.documentElement.classList.toggle('big-text', big); }, [big]);
  return <Ctx.Provider value={{ lang, setLang, big, setBig }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** Shows Urdu script or Roman Urdu depending on the user's toggle. */
export function T({ ur, roman, className = '' }: { ur: string; roman: string; className?: string }) {
  const { lang } = useLang();
  return lang === 'ur'
    ? <span dir="rtl" className={`font-urdu block ${className}`}>{ur}</span>
    : <span className={className}>{roman}</span>;
}
