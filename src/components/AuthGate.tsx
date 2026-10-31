'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Notice } from './ui';
import { BANKS } from '@/lib/banks/directory';
import { clearLocal, closeSession, decryptWith, deriveKey, deleteAll, encryptWith, load, openSession, randomSalt, save, PBKDF2_ITERATIONS } from '@/lib/storage';
import { firebaseEnabled, getRemoteAuth, getVault, putVault, setRemoteAuth, signInWithGoogle, watchUser, wipeRemote } from '@/lib/cloud';
import { logActivity } from '@/lib/activity';

/** Picture code: 9 pictures, choose 4 in order. Deliberately NOT digits, so nobody re-uses a bank PIN. */
export const PICS = [
  { e: '🌙', n: 'Chaand' }, { e: '⭐', n: 'Sitara' }, { e: '🍎', n: 'Saib' },
  { e: '🐟', n: 'Machli' }, { e: '🌹', n: 'Gulab' }, { e: '🏠', n: 'Ghar' },
  { e: '🚗', n: 'Gaari' }, { e: '🕌', n: 'Masjid' }, { e: '☕', n: 'Chai' },
];
const CODE_LEN = 4;
const IDLE_MS = 5 * 60 * 1000; // auto-lock after 5 minutes without activity
const VERIFIER = 'bank-saathi-ok';

interface AuthRecord { v: 1; salt: string; iterations: number; verifier: string; failed: number; lockUntil: number; uid?: string }
export interface Profile { name: string; bank: string | null; createdAt: string }

type Phase = 'loading' | 'signin' | 'welcome' | 'create' | 'confirm' | 'name' | 'bank' | 'locked' | 'open';

function PicturePad({ value, onChange, disabled }: { value: number[]; onChange: (v: number[]) => void; disabled?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-3" aria-live="polite" aria-label={`${value.length} of ${CODE_LEN} chosen`}>
        {Array.from({ length: CODE_LEN }).map((_, i) => (
          <span key={i} className={`h-14 w-14 rounded-2xl border-2 grid place-items-center text-3xl ${value[i] !== undefined ? 'border-primary bg-primaryTint' : 'border-dashed border-borderStrong'}`}>
            {value[i] !== undefined ? '●' : ''}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {PICS.map((p, i) => (
          <button key={p.n} type="button" disabled={disabled || value.length >= CODE_LEN} onClick={() => onChange([...value, i])}
            aria-label={p.n} className="h-20 rounded-2xl border border-border bg-white text-4xl hover:bg-surfaceAlt active:scale-95 transition-transform disabled:opacity-50">
            {p.e}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        <Button variant="ghost" type="button" onClick={() => onChange(value.slice(0, -1))} disabled={disabled || !value.length}>⌫ Peechay</Button>
      </div>
    </div>
  );
}

const secretOf = (v: number[]) => v.join('-');

export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [code, setCode] = useState<number[]>([]);
  const [first, setFirst] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const idle = useRef<ReturnType<typeof setTimeout>>();
  const [user, setUser] = useState<{ uid: string; name: string | null; email: string | null } | null>(null);

  useEffect(() => {
    if (!firebaseEnabled) {
      const rec = load<AuthRecord | null>('auth', null);
      setPhase(rec ? 'locked' : 'welcome');
      return;
    }
    return watchUser(async (u) => {
      if (!u) { closeSession(); setUser(null); setPhase('signin'); return; }
      setUser({ uid: u.uid, name: u.displayName, email: u.email });
      if (u.displayName) setName((n) => n || u.displayName!.split(' ')[0]);
      let local = load<AuthRecord | null>('auth', null);
      if (local?.uid && local.uid !== u.uid) { clearLocal(); local = null; } // another account used this phone before
      try {
        const remote = await getRemoteAuth(u.uid);
        if (remote) {
          const same = local?.verifier === remote.verifier;
          save<AuthRecord>('auth', { v: 1, ...remote, uid: u.uid, failed: same ? local!.failed : 0, lockUntil: same ? local!.lockUntil : 0 });
          setPhase('locked');
          return;
        }
        if (local && local.uid === u.uid) { await setRemoteAuth(u.uid, { salt: local.salt, iterations: local.iterations, verifier: local.verifier }); setPhase('locked'); return; }
        setPhase('welcome');
      } catch {
        // offline: fall back to this phone's copy if it belongs to the same account
        setPhase(local && local.uid === u.uid ? 'locked' : 'welcome');
        if (!(local && local.uid === u.uid)) setError('Internet nahi hai. Pehli dafa ke liye internet chahiye.');
      }
    });
  }, []);

  const remoteOpts = () => (user ? { uid: user.uid, fetch: getVault, put: putVault } : undefined);

  const lock = useCallback((reason: string) => {
    if (phase === 'open') logActivity('Login', 'security', reason);
    closeSession();
    setCode([]);
    setPhase('locked');
  }, [phase]);

  // auto-lock on inactivity
  useEffect(() => {
    if (phase !== 'open') return;
    const reset = () => { clearTimeout(idle.current); idle.current = setTimeout(() => lock('5 minute kuch na karne par app khud lock ho gayi.'), IDLE_MS); };
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const onLock = () => lock('Aap ne app lock ki.');
    window.addEventListener('bank-saathi:lock', onLock);
    reset();
    return () => { clearTimeout(idle.current); evs.forEach((e) => window.removeEventListener(e, reset)); window.removeEventListener('bank-saathi:lock', onLock); };
  }, [phase, lock]);

  // lockout countdown tick
  useEffect(() => {
    if (phase !== 'locked') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ---- create ----
  const finishCreate = async (confirm: number[]) => {
    if (secretOf(confirm) !== secretOf(first)) { setError('Tasveerein pehle wali se nahi milin. Dobara banayein.'); setFirst([]); setCode([]); setPhase('create'); return; }
    setBusy(true);
    try {
      const salt = randomSalt();
      const k = await deriveKey(secretOf(confirm), salt);
      const verifier = await encryptWith(k, VERIFIER);
      save<AuthRecord>('auth', { v: 1, salt, iterations: PBKDF2_ITERATIONS, verifier, failed: 0, lockUntil: 0, uid: user?.uid });
      if (user) await setRemoteAuth(user.uid, { salt, iterations: PBKDF2_ITERATIONS, verifier });
      await openSession(k, remoteOpts());
      logActivity('Login', 'security', 'Naya Tasveer Code banaya. Aap ka data is phone par taale (encryption) mein hai.');
      setError(null); setCode([]); setPhase('name');
    } finally { setBusy(false); }
  };

  // ---- unlock ----
  const tryUnlock = async (attempt: number[]) => {
    const rec = load<AuthRecord | null>('auth', null);
    if (!rec) return;
    if (rec.lockUntil > Date.now()) return;
    setBusy(true);
    try {
      const k = await deriveKey(secretOf(attempt), rec.salt, rec.iterations);
      const ok = await decryptWith<string>(k, rec.verifier).then((v) => v === VERIFIER).catch(() => false);
      if (ok) {
        save<AuthRecord>('auth', { ...rec, failed: 0, lockUntil: 0 });
        await openSession(k, remoteOpts());
        logActivity('Login', 'security', rec.failed ? `App khuli. Is se pehle ${rec.failed} ghalat koshishen hui thin.` : 'App khuli (Tasveer Code sahi).');
        setError(null); setCode([]);
        setPhase(load<Profile | null>('profile', null) ? 'open' : 'name');
      } else {
        const failed = rec.failed + 1;
        // after 5 wrong tries: wait 30s, doubling each time, max 15 minutes
        const lockUntil = failed >= 5 ? Date.now() + Math.min(15 * 60, 30 * 2 ** (failed - 5)) * 1000 : 0;
        save<AuthRecord>('auth', { ...rec, failed, lockUntil });
        setError(failed >= 5 ? 'Bohat ghalat koshishen. Thora intezar karein, phir dobara.' : `Tasveerein ghalat hain. ${5 - failed} koshishen baqi.`);
        setCode([]);
      }
    } finally { setBusy(false); }
  };

  const rec = phase === 'locked' ? load<AuthRecord | null>('auth', null) : null;
  const waitS = rec ? Math.max(0, Math.ceil((rec.lockUntil - now) / 1000)) : 0;

  if (phase === 'open') return <>{children}</>;

  const shell = (body: ReactNode) => (
    <div className="min-h-screen bg-surfaceAlt flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-[28px] border border-border shadow-card p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-2xl bg-primary text-white grid place-items-center font-bold text-xl">ہ</span>
          <div><p className="font-bold text-lg">Humraah</p><p className="text-inkMuted text-sm">Aap ka banking saathi</p></div>
        </div>
        {body}
      </div>
    </div>
  );

  if (phase === 'loading') return shell(<p className="text-inkMuted">Khol raha hoon…</p>);

  if (phase === 'signin') return shell(
    <>
      <p className="font-urdu text-2xl text-primaryDark" dir="rtl">خوش آمدید! پہلے اپنے گوگل اکاؤنٹ سے لاگ ان کریں۔</p>
      <p className="text-inkSecondary">Wohi Google account jo aap ke phone mein hai (Gmail). Is se aap ka data naye phone par bhi wapas mil jayega.</p>
      <Button className="w-full !min-h-[56px] text-lg" disabled={busy} onClick={async () => {
        setBusy(true); setError(null);
        try { await signInWithGoogle(); } catch { setError('Login nahi hua. Internet check karein aur dobara koshish karein.'); } finally { setBusy(false); }
      }}>
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z" /></svg>
        Google se login karein
      </Button>
      <Notice>Hum sirf aap ka naam aur email dekhte hain. Aap ka Gmail password Google ke paas rehta hai, hamare paas nahi. Bank ka koi password yahan kabhi nahi.</Notice>
      {error && <Notice tone="warning">{error}</Notice>}
    </>,
  );

  if (phase === 'welcome') return shell(
    <>
      <p className="font-urdu text-2xl text-primaryDark" dir="rtl">خوش آمدید! پہلے اپنا تصویر کوڈ بنائیں۔</p>
      <p className="text-inkSecondary">Aap ki kharcha diary, bills aur history taale (encryption) mein rahegi{user ? ': phone par aur aap ke cloud account mein, jahan sirf taala-band (encrypted) copy jati hai. Hum bhi isay nahi parh sakte' : ', sirf is phone par'}. Taala kholne ke liye aap <b>4 tasveerein</b> chunenge.</p>
      {!firebaseEnabled && <Notice>Demo mode: cloud login band hai (Firebase set nahi). Data sirf is phone par.</Notice>}
      <Notice tone="warning">Yeh code tasveeron ka hai, numbers ka nahi, taa ke aap <b>bank ka PIN yahan kabhi na dalein</b>.</Notice>
      <Button className="w-full" onClick={() => setPhase('create')}>Tasveer Code banayein</Button>
    </>,
  );

  if (phase === 'create' || phase === 'confirm') return shell(
    <>
      <p className="text-xl font-bold">{phase === 'create' ? '4 tasveerein chunein (yaad rakhein)' : 'Wohi 4 tasveerein dobara, usi tarteeb se'}</p>
      <PicturePad value={code} disabled={busy} onChange={(v) => {
        setCode(v);
        if (v.length === CODE_LEN) {
          if (phase === 'create') { setFirst(v); setTimeout(() => { setCode([]); setPhase('confirm'); }, 250); }
          else finishCreate(v);
        }
      }} />
      {busy && <p className="text-primaryDark text-center" role="status">Taala laga raha hoon…</p>}
      {error && <Notice tone="warning">{error}</Notice>}
    </>,
  );

  if (phase === 'name') return shell(
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; save<Profile>('profile', { name: name.trim().slice(0, 40), bank: null, createdAt: new Date().toISOString() }); setPhase('bank'); }}>
      <p className="text-xl font-bold">Hum aap ko kya kahein?</p>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Maslan: Nasreen" maxLength={40} className="w-full min-h-[52px] px-4 rounded-xl border border-borderStrong text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primaryTint" aria-label="Naam" />
      <p className="text-sm text-inkMuted">Sirf naam. CNIC, account number ya PIN kabhi nahi.</p>
      <Button className="w-full" disabled={!name.trim()}>Aagay</Button>
    </form>,
  );

  if (phase === 'bank') return shell(
    <>
      <p className="font-urdu text-xl text-primaryDark" dir="rtl">آپ کون سی بینک ایپ استعمال کرتے ہیں؟</p>
      <p className="text-xl font-bold">Aap kaunsi bank app istemal karte hain?</p>
      <div className="grid grid-cols-2 gap-3">
        {BANKS.map((b) => (
          <button key={b.id} onClick={() => { const p = load<Profile | null>('profile', null); save<Profile>('profile', { ...(p ?? { name, createdAt: new Date().toISOString() }), bank: b.id } as Profile); logActivity('Profile', 'shared', `Aap ne bataya ke aap ${b.name} (${b.app}) istemal karte hain.`); setPhase('open'); }}
            className="rounded-2xl border border-border p-4 text-start hover:border-primary hover:bg-primaryTint min-h-[84px]">
            <span className="block font-bold text-lg">{b.name}</span>
            <span className="block text-sm text-inkMuted">{b.app}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="w-full" onClick={() => { const p = load<Profile | null>('profile', null); if (p) save<Profile>('profile', { ...p, bank: null }); setPhase('open'); }}>Koi aur / abhi nahi pata</Button>
    </>,
  );

  // locked
  return shell(
    <>
      <p className="font-urdu text-2xl text-primaryDark" dir="rtl">خوش آمدید! اپنا تصویر کوڈ لگائیں۔</p>
      <p className="text-inkSecondary">Apni 4 tasveerein usi tarteeb se dabayein.</p>
      {waitS > 0 ? (
        <Notice tone="warning">Hifazat ke liye {waitS} second intezar karein.</Notice>
      ) : (
        <PicturePad value={code} disabled={busy} onChange={(v) => { setCode(v); if (v.length === CODE_LEN) tryUnlock(v); }} />
      )}
      {busy && <p className="text-primaryDark text-center" role="status">Taala khol raha hoon…</p>}
      {error && <Notice tone="warning">{error}</Notice>}
      <details className="text-[16px]">
        <summary className="cursor-pointer text-inkMuted">Code bhool gaye?</summary>
        <p className="text-inkSecondary mt-2">Hifazat ki wajah se code ke baghair purana data nahi khul sakta. Aap naya shuru kar sakte hain: is phone par Humraah ka <b>sara data delete</b> ho jayega. Aap ke bank account par koi asar nahi.</p>
        <Button variant="danger" className="mt-2" onClick={async () => {
          if (!confirm('Sara Humraah data delete kar ke naya shuru karein?')) return;
          if (user) { try { await wipeRemote(user.uid); } catch { setError('Internet nahi: cloud ka data delete nahi hua. Dobara koshish karein.'); return; } }
          deleteAll(); setError(null); setPhase('welcome');
        }}>Naya shuru karein</Button>
      </details>
    </>,
  );
}

/** Ask the gate to lock now (used by the header lock button). */
export const lockNow = () => window.dispatchEvent(new Event('bank-saathi:lock'));
