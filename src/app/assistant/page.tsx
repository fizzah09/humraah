'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import { Badge, Button, Notice } from '@/components/ui';
import { useLang } from '@/components/LangProvider';
import { findLabel, type OcrWord } from '@/lib/image';
import { listen, speakUrdu, stopSpeaking, useSpeechSupported } from '@/lib/speech';
import { apiPost } from '@/lib/api';
import { useStored } from '@/lib/storage';
import { BANKS } from '@/lib/banks/directory';
import type { AssistantStep } from '@/lib/assistant/schema';
import { load } from '@/lib/storage';
import { logActivity, markImageDeleted, updateImageMeta } from '@/lib/activity';
import { bankById } from '@/lib/banks/directory';
import type { Profile } from '@/components/AuthGate';

/** Screenshots stay on screen for 2 minutes so the user can follow the highlight, then are deleted. */
const IMAGE_TTL_MS = 2 * 60 * 1000;

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  text?: string;
  image?: string;
  imageDeleted?: string; // short metadata line shown after deletion
  logId?: string;
  step?: AssistantStep;
  mode?: 'playbook' | 'generic' | 'ai';
  highlight?: { box: OcrWord['bbox']; w: number; h: number } | null;
}

const QUICK = [
  { label: 'Balance dekhna', msg: 'Balance dekhna hai' },
  { label: 'Paise bhejna', msg: 'Paise bhejne hain' },
  { label: 'Bill pay karna', msg: 'Bijli ka bill pay karna hai' },
  { label: 'Main kho gaya', msg: 'Main lost ho gaya, shuru se' },
  { label: 'Galat tap ho gaya', msg: 'Galat button daba diya' },
];

let nextId = 1;

export default function AssistantPage() {
  const { lang } = useLang();
  const canSpeak = useSpeechSupported();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 0,
      role: 'assistant',
      step: {
        screen_name: 'welcome', confidence: 1, target_label: null, warnings: [], needs_clarification: false, is_money_step: false, task_complete: false,
        next_instruction_ur: 'السلام علیکم! میں آپ کا بینک ساتھی ہوں۔ بتائیں آپ کیا کرنا چاہتے ہیں؟',
        next_instruction_roman: 'Assalam-o-Alaikum! Main aap ka Bank Saathi hoon. Batayein aap kya karna chahte hain?',
      },
    },
  ]);
  const [state, setState] = useState<{ task: string | null; bank: string | null; stepIndex: number }>({ task: null, bank: null, stepIndex: 0 });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [micStatus, setMicStatus] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [autoSpeak, setAutoSpeak] = useStored<boolean>('autoSpeak', true);
  const stopRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // start with the bank the user chose after login
  useEffect(() => {
    const p = load<Profile | null>('profile', null);
    if (p?.bank) setState((st) => ({ ...st, bank: p.bank }));
  }, []);

  const scheduleImageDelete = (logId: string) => {
    setTimeout(() => {
      setMsgs((ms) => ms.map((m) => (m.logId === logId && m.image ? { ...m, image: undefined, imageDeleted: `Tasveer delete kar di gayi (${new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}). Sirf tafseel history mein hai.` } : m)));
      markImageDeleted(logId);
    }, IMAGE_TTL_MS);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, loading]);

  const history = () =>
    msgs.slice(-10).map((m) => ({ role: m.role, text: (m.text ?? m.step?.next_instruction_roman ?? '').slice(0, 1500) }));

  async function send(message: string, img?: UploadedImage) {
    if (!message.trim() && !img) return;
    const userMsg: Msg = { id: nextId++, role: 'user', text: message || undefined, image: img?.dataUrl, logId: img?.logId };
    if (message.trim()) logActivity('Saathi', 'said', `Aap ne kaha: "${message.trim()}"`);
    if (img) scheduleImageDelete(img.logId);
    setMsgs((m) => [...m, userMsg]);
    setInput('');
    setShowUpload(false);
    setLoading(true);
    try {
      const { ok, status, data } = await apiPost<any>('/api/assistant', { message, image: img?.dataUrl ?? null, ocrText: img?.ocr?.text, state, history: history() });
      if (!ok) throw new Error(data?.error ?? (status === 401 ? 'login' : 'error'));
      setState(data.state);
      const step: AssistantStep = data.step;
      if (img) updateImageMeta(img.logId, { sentToAI: !!data.sentToAI });
      logActivity('Saathi', 'reply', `Saathi ne kaha: ${step.next_instruction_roman}${step.is_money_step ? ' (paise wala qadam: check karne ko kaha)' : ''}`);
      let highlight: Msg['highlight'] = null;
      if (img && step.target_label && img.ocr?.words.length) {
        const box = findLabel(img.ocr.words, step.target_label);
        if (box) {
          const i = new Image();
          i.src = img.dataUrl;
          await i.decode().catch(() => {});
          highlight = { box, w: i.naturalWidth, h: i.naturalHeight };
        }
      }
      setMsgs((m) => [...m, { id: nextId++, role: 'assistant', step, mode: data.mode, image: highlight ? img!.dataUrl : undefined, highlight, logId: img?.logId }]);
      if (autoSpeak) speakUrdu(step.next_instruction_ur, step.next_instruction_roman);
    } catch (err) {
      const isLogin = (err as Error).message === 'login';
      setMsgs((m) => [...m, {
        id: nextId++, role: 'assistant', step: {
          screen_name: 'error', confidence: 0, target_label: null, warnings: [], needs_clarification: true, is_money_step: false, task_complete: false,
          next_instruction_ur: isLogin ? 'براہ کرم پہلے لاگ ان کر لیں، پھر سوال پوچھیں۔' : 'معذرت، ابھی جواب نہیں آ سکا۔ دوبارہ کوشش کریں یا اسکرین پر لکھے بٹن کے نام لکھ دیں۔',
          next_instruction_roman: isLogin ? 'Meharbani kar ke pehle login karein, phir sawal poochein.' : 'Maazrat, abhi jawab nahi aa saka. Dobara koshish karein ya screen par likhe button ke naam likh dein.',
        },
      }]);
    } finally {
      setLoading(false);
    }
  }

  const toggleMic = () => {
    if (listening) {
      // User tapped mic again = stop and send whatever we have
      stopRef.current?.();
      setListening(false);
      setMicStatus(null);
      if (input.trim()) send(input.trim());
      return;
    }
    setInput('');
    setMicStatus('🎙️ Sun raha hoon… bolein (ya likh kar Bhejein dabayein)');
    const stop = listen(
      'ur-PK',
      (t) => {
        // Final speech result → auto-send
        setListening(false);
        setMicStatus(null);
        setInput(t);
        send(t);
      },
      () => {
        // Recognition ended (no error)
        setListening(false);
        setMicStatus(null);
      },
      (err) => {
        setListening(false);
        if (err === 'no-speech') {
          setMicStatus('Awaaz sunai nahi di — dobara bolein ya keyboard se likhein.');
        } else if (err === 'not-allowed') {
          setMicStatus('❌ Microphone block hai. Address bar mein lock icon par tap kar ke mic allow karein.');
        } else if (err === 'network') {
          // network error — speech.ts already retried with hi-IN/en-US
          // show a helpful message but keep the input box active for typing
          setMicStatus('⚠️ Speech server available nahi. Neeche likh kar Bhejein.');
        } else {
          setMicStatus('Awaaz record nahi ho saki — dobara koshish karein.');
        }
        setTimeout(() => setMicStatus(null), 7000);
      },
      (interim) => {
        // Live streaming text into input box while speaking
        setInput(interim);
      }
    );
    if (stop) {
      stopRef.current = stop;
      setListening(true);
    } else {
      // Browser doesn't support speech API at all
      setMicStatus('⚠️ Yeh browser mic support nahi karta. Chrome ya Edge use karein, ya keyboard se likhein.');
      setTimeout(() => setMicStatus(null), 7000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-[calc(100vh-12rem)] min-w-0">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Saathi se poochein</h1>
          <p className="text-inkMuted text-[16px]">Screenshot bhejein, ek ek qadam Urdu mein. Aap khud tap karein.</p>
        </div>
        {state.task && (
          <Badge tone="success">{bankById(state.bank)?.name ?? 'Bank?'} · {state.task.replace('_', ' ')} · qadam {state.stepIndex + 1}</Badge>
        )}
      </div>

      <div className="flex-1 space-y-4" aria-live="polite">
        {msgs.map((m) => (m.role === 'user' ? <UserBubble key={m.id} m={m} /> : <BotBubble key={m.id} m={m} lang={lang} />))}
        {loading && (
          <div className="flex items-center gap-3 text-primaryDark bg-surfaceAlt rounded-2xl px-4 py-3 w-fit" role="status">
            <span className="h-5 w-5 rounded-full border-[3px] border-primaryTint border-t-primary animate-spin" />
            Aap ki screen parh raha hoon…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-20 lg:bottom-4 mt-6 bg-white/95 backdrop-blur border border-border rounded-2xl p-3 shadow-card space-y-3">
        {(() => {
          const last = [...msgs].reverse().find((m) => m.role === 'assistant')?.step;
          if (!last?.needs_clarification || loading) return null;
          const opts = !state.task
            ? [['Balance dekhna hai', 'Balance'], ['Paise bhejne hain', 'Paise bhejna'], ['Bill pay karna hai', 'Bill'], ['Kuch aur poochna hai', 'Kuch aur']]
            : !state.bank
              ? BANKS.map((b) => [`${b.name} istemal karti hoon`, b.name])
              : [['Main screen ka screenshot bhejti hoon', 'Screenshot bhejein'], ['Main lost ho gaya, shuru se', 'Shuru se'], ['Mujhe samajh nahi aaya, dobara samjhayein', 'Dobara samjhayein']];
          return (
            <div className="rounded-xl bg-warningBg p-2" role="group" aria-label="Jawab chunein">
              <p className="text-[15px] text-warning font-semibold px-1 mb-1">Saathi pooch raha hai: neeche se chunein ya likhein</p>
              <div className="flex gap-2 flex-wrap">
                {opts.map(([msg, label]) => (
                  <button key={label} onClick={() => (label === 'Screenshot bhejein' ? setShowUpload(true) : send(msg))} className="px-3 py-2 rounded-full bg-white border border-warning/40 text-[15px] font-medium">{label}</button>
                ))}
              </div>
            </div>
          );
        })()}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {QUICK.map((q) => (
            <button key={q.label} onClick={() => send(q.msg)} className="shrink-0 px-3 py-2 rounded-full bg-primaryTint text-primaryDark text-[15px] font-medium hover:bg-surfaceMuted">
              {q.label}
            </button>
          ))}
        </div>
        {showUpload && (
          <ImageUpload feature="Saathi" holdForDisplay withOcr label="Bank app ka screenshot" hint="Screenshot block ho to doosre phone se screen ki photo khainchein." onImage={(img) => send(input, img)} />
        )}
        <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <button type="button" onClick={() => setShowUpload((s) => !s)} aria-label="Attach screenshot" className={`h-12 w-12 shrink-0 rounded-xl grid place-items-center border ${showUpload ? 'bg-primary text-white border-primary' : 'border-borderStrong text-primary hover:bg-surfaceAlt'}`}>
            <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="9" r="1.8" /><path d="m21 15-4.5-4.5L6 21" /></svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "🔴 Sun raha hoon... bolein" : "Likhein… (Urdu, Roman Urdu ya English)"}
            className={`flex-1 min-w-0 min-h-[48px] px-4 rounded-xl border ${listening ? 'border-danger ring-2 ring-danger/20' : 'border-borderStrong'} focus:outline-none focus:border-primary focus:ring-4 focus:ring-primaryTint`}
            aria-label="Message"
          />
          {canSpeak && (
            <button type="button" onClick={toggleMic} aria-label={listening ? 'Stop listening' : 'Speak'} className={`h-12 w-12 shrink-0 rounded-xl grid place-items-center ${listening ? 'bg-danger text-white animate-pulse' : 'bg-primaryTint text-primaryDark'}`}>
              <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
          )}
          <Button type="submit" disabled={loading || !input.trim()} className="shrink-0 !px-4" aria-label="Bhejein">Bhejein</Button>
        </form>
        {micStatus && (
          <p className={`text-sm font-semibold ${listening ? 'text-primary' : 'text-danger'}`}>
            🎙️ {micStatus}
          </p>
        )}
        <label className="flex items-center gap-2 text-[15px] text-inkSecondary">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={autoSpeak} onChange={(e) => { setAutoSpeak(e.target.checked); if (!e.target.checked) stopSpeaking(); }} />
          🔊 Saathi jawab khud bol kar sunaye (Urdu)
        </label>
        <p className="text-xs text-inkMuted">PIN, OTP, password ya card number kabhi na likhein. Screenshot 2 minute baad delete; sirf us ki tafseel <Link href="/history" className="underline">history</Link> mein rehti hai.</p>
      </div>
    </div>
  );
}

function UserBubble({ m }: { m: Msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] space-y-2">
        {m.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.image} alt="Your screenshot" className="rounded-2xl border border-border max-h-72 ms-auto" />
        )}
        {m.imageDeleted && <p className="text-sm text-inkMuted bg-surfaceAlt rounded-xl px-3 py-2">🗑 {m.imageDeleted}</p>}
        {m.text && <div className="bg-primary text-white rounded-2xl rounded-ee-md px-4 py-3">{m.text}</div>}
      </div>
    </div>
  );
}

function BotBubble({ m, lang }: { m: Msg; lang: 'ur' | 'roman' }) {
  const s = m.step!;
  const text = lang === 'ur' ? s.next_instruction_ur : s.next_instruction_roman;
  return (
    <div className="flex gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-primary text-white grid place-items-center font-bold">ب</span>
      <div className="max-w-[85%] space-y-2">
        <div className={`rounded-2xl rounded-ss-md px-4 py-3 border ${s.is_money_step ? 'bg-warningBg border-warning/40' : 'bg-surfaceAlt border-border'}`}>
          {s.is_money_step && <p className="font-bold text-warning mb-1">⚠ Rukein: paise wala qadam</p>}
          <p className={lang === 'ur' ? 'font-urdu text-[20px] leading-[2.3]' : 'text-[19px]'} dir={lang === 'ur' ? 'rtl' : 'ltr'}>{text}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button onClick={() => speakUrdu(s.next_instruction_ur, s.next_instruction_roman)} className="text-sm text-primary font-semibold hover:underline" aria-label="Read aloud">🔊 Sunein</button>
            {m.mode === 'generic' && <Badge tone="warning">Lower confidence, double-check</Badge>}
            {m.mode === 'ai' && <Badge tone="neutral">AI vision</Badge>}
            {s.screen_name && !['chat', 'welcome', 'error'].includes(s.screen_name) && <Badge tone="neutral">Screen: {s.screen_name}</Badge>}
          </div>
        </div>
        {m.image && m.highlight && (
          <div className="relative inline-block rounded-2xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.image} alt={`Tap "${s.target_label}"`} className="block max-h-80" />
            <div
              className="absolute border-[3px] border-danger rounded-lg shadow-[0_0_0_9999px_rgba(10,20,16,0.35)] animate-pulse"
              style={{
                left: `${((m.highlight.box.x0 - 6) / m.highlight.w) * 100}%`,
                top: `${((m.highlight.box.y0 - 6) / m.highlight.h) * 100}%`,
                width: `${((m.highlight.box.x1 - m.highlight.box.x0 + 12) / m.highlight.w) * 100}%`,
                height: `${((m.highlight.box.y1 - m.highlight.box.y0 + 12) / m.highlight.h) * 100}%`,
              }}
            />
          </div>
        )}
        {s.why_roman && (
          <p className="text-[16px] text-inkSecondary bg-white border border-border rounded-xl px-4 py-2"><b className="text-primaryDark">Kyun?</b> {s.why_roman}</p>
        )}
        {s.warnings.map((w) => <Notice key={w} tone="warning">{w}</Notice>)}
        {s.task_complete && (
          <div className="rounded-2xl border border-primaryLight bg-successBg p-4 space-y-2">
            <p className="font-bold text-primaryDark">Shabash, aap ne khud kar liya! Kya kaam ho gaya? Agli baar ke liye yaad rakhein:</p>
            <ol className="list-decimal ps-5 text-inkSecondary">
              {(s.recap_roman ?? []).map((r) => <li key={r}>{r}</li>)}
            </ol>
            <div className="flex gap-4 flex-wrap">
              <Link href="/ledger" className="text-primary font-semibold hover:underline">Kharcha diary mein likhein (kis liye paise gaye?) →</Link>
              <Link href="/practice" className="text-primary font-semibold hover:underline">Naqli app par dobara mashq karein →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
