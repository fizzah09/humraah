'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from './LangProvider';
import { lockNow } from './AuthGate';

export const NAV = [
  { href: '/', label: 'Ghar', ur: 'گھر', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { href: '/assistant', label: 'Saathi', ur: 'ساتھی', icon: 'M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zM5 11a7 7 0 0 0 14 0M12 18v3' },
  { href: '/practice', label: 'Mashq', ur: 'مشق', icon: 'M4 19V5a2 2 0 0 1 2-2h12v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h12M9 7h6M9 11h4' },
  { href: '/statement', label: 'Statement', ur: 'اسٹیٹمنٹ', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
  { href: '/ledger', label: 'Kharcha diary', ur: 'خرچہ ڈائری', icon: 'M4 5h16v14H4zM4 9h16M9 13h6' },
  { href: '/scam', label: 'Fraud check', ur: 'فراڈ چیک', icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM12 8v5M12 16h.01' },
  { href: '/sauda', label: 'Sauda', ur: 'سودا', icon: 'M3 4h2l2.5 11h11L21 7H7M9.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  { href: '/banks', label: 'Mera bank', ur: 'میرا بینک', icon: 'M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18' },
  { href: '/zakat', label: 'Zakat', ur: 'زکوٰۃ', icon: 'M12 3v18M7 7h7.5a3.5 3.5 0 0 1 0 7H8M7 14h9' },
  { href: '/history', label: 'Meri history', ur: 'میری ہسٹری', icon: 'M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' },
  { href: '/fitra', label: 'Fitra', ur: 'فطرہ', icon: 'M12 3a6 6 0 1 0 6 6M12 3v6h6M6 21h12M9 17h6' },
  { href: '/bills', label: 'Bill yaad', ur: 'بل یاد', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
];

/** Mobile bottom bar keeps 5 big targets; the rest are big tiles on the home screen. */
const BOTTOM = ['/', '/assistant', '/practice', '/sauda', '/scam'];
/** Desktop header keeps the most used; everything is also a big tile on the home screen. */
const TOP = ['/assistant', '/practice', '/sauda', '/scam', '/bills', '/banks'];

export function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  const { lang, setLang, big, setBig } = useLang();
  const label = (n: (typeof NAV)[number]) => (lang === 'ur' ? n.ur : n.label);
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="h-10 w-10 rounded-xl bg-primary text-white grid place-items-center font-bold text-lg">ہ</span>
            <span className="leading-tight hidden sm:block">
              <span className="block font-bold text-ink">Humraah</span>
              <span className="block text-xs text-inkMuted">Aap ka banking saathi</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 ms-4" aria-label="Main">
            {NAV.filter((n) => TOP.includes(n.href)).map((n) => (
              <Link key={n.href} href={n.href} className={`px-3 py-2 rounded-lg text-[16px] font-medium ${path === n.href ? 'bg-primaryTint text-primaryDark' : 'text-inkSecondary hover:bg-surfaceAlt'}`}>
                <span className={lang === 'ur' ? 'font-urdu' : ''}>{label(n)}</span>
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <button onClick={() => setBig(!big)} aria-pressed={big} aria-label="Bara text" title="Bara text" className={`h-11 px-3 rounded-xl border font-bold ${big ? 'bg-primary text-white border-primary' : 'border-border text-inkSecondary hover:bg-surfaceAlt'}`}>A<span className="text-lg">A</span></button>
            <div className="flex rounded-xl border border-border p-1 bg-surfaceAlt" role="group" aria-label="Language">
              <button onClick={() => setLang('ur')} className={`px-3 py-1.5 rounded-lg text-[15px] font-urdu ${lang === 'ur' ? 'bg-white shadow-card text-primaryDark' : 'text-inkMuted'}`} style={{ lineHeight: 1.6 }}>اردو</button>
              <button onClick={() => setLang('roman')} className={`px-3 py-1.5 rounded-lg text-[15px] ${lang === 'roman' ? 'bg-white shadow-card text-primaryDark' : 'text-inkMuted'}`}>Roman</button>
            </div>
            <button onClick={lockNow} aria-label="App lock karein" title="Lock" className="h-11 w-11 grid place-items-center rounded-xl text-inkSecondary hover:bg-surfaceAlt">
              <Icon d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4" />
            </button>
            <Link href="/settings" aria-label="Privacy & settings" className="h-11 w-11 grid place-items-center rounded-xl text-inkSecondary hover:bg-surfaceAlt">
              <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </Link>
          </div>
        </div>
      </header>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border" aria-label="Bottom">
        <div className="grid grid-cols-5">
          {BOTTOM.map((href) => {
            const n = NAV.find((x) => x.href === href)!;
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 min-h-[60px] text-[14px] font-medium ${path === href ? 'text-primary' : 'text-inkMuted'}`}>
                <Icon d={n.icon} size={24} />
                <span className={lang === 'ur' ? 'font-urdu text-[13px] leading-[1.9]' : ''}>{label(n)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
