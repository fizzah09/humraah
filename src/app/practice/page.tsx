'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Notice, PageHeader } from '@/components/ui';
import { T, useLang } from '@/components/LangProvider';
import { useStored } from '@/lib/storage';
import { speakUrdu } from '@/lib/speech';
import { LESSONS, SCAM_QUIZ, type Lesson, type SimStep } from '@/lib/practice/lessons';

const FACES = ['😟', '🙁', '😐', '🙂', '😄'];

interface Progress { done: string[]; before: Record<string, number>; after: Record<string, number> }

export default function PracticePage() {
  const { lang } = useLang();
  const [stored, setProgress] = useStored<Progress>('practice', { done: [], before: {}, after: {} });
  const progress: Progress = Object.assign({ done: [], before: {}, after: {} }, stored);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [phase, setPhase] = useState<'before' | 'play' | 'after' | 'done'>('before');
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [value, setValue] = useState('');
  const [scamIdx, setScamIdx] = useState<number | null>(null);
  const [scamAnswer, setScamAnswer] = useState<boolean | null>(null);
  const [scamScore, setScamScore] = useState(0);

  const step = lesson?.steps[idx];

  const start = (l: Lesson) => { setLesson(l); setPhase('before'); setIdx(0); setWrong(0); setFeedback(null); setValue(''); };
  const next = () => {
    setFeedback(null); setWrong(0); setValue('');
    if (idx + 1 < lesson!.steps.length) setIdx(idx + 1); else setPhase('after');
  };
  const right = (text: string) => setFeedback({ ok: true, text });
  const miss = (text: string) => { setWrong((w) => w + 1); setFeedback({ ok: false, text }); };

  const rate = (n: number) => {
    if (!lesson) return;
    if (phase === 'before') { setProgress((p) => ({ ...progress, ...p, before: { ...(p.before ?? {}), [lesson.id]: n } })); setPhase('play'); }
    else { setProgress((p) => ({ ...progress, ...p, after: { ...(p.after ?? {}), [lesson.id]: n }, done: [...new Set([...(p.done ?? []), lesson.id])] })); setPhase('done'); }
  };

  // ---------- Lesson list ----------
  if (!lesson) {
    const sq = scamIdx !== null ? SCAM_QUIZ[scamIdx] : null;
    return (
      <div className="space-y-6">
        <PageHeader title="Mashq karein" urdu="ڈر کے بغیر سیکھیں: نقلی بینک ایپ پر مشق" subtitle="Yeh naqli bank app hai. Yahan koi asli paisa nahi. Ghalat button dabane se kuch kharab nahi hota, aap sirf seekhte hain." />
        <div className="grid md:grid-cols-3 gap-4">
          {LESSONS.map((l) => {
            const b = progress.before[l.id], a = progress.after[l.id];
            return (
              <Card key={l.id} className="flex flex-col">
                <p className="font-urdu text-primary text-lg" dir="rtl">{l.titleUr}</p>
                <p className="font-bold text-xl text-ink">{l.title}</p>
                <p className="text-inkMuted text-[16px] mb-3">{l.steps.length} qadam · {l.minutes} minute</p>
                {progress.done.includes(l.id) && (
                  <p className="mb-3"><Badge tone="success">✓ Seekh liya</Badge>{b && a ? <span className="ms-2 text-[16px] text-inkSecondary">Hausla: {FACES[b - 1]} → {FACES[a - 1]}</span> : null}</p>
                )}
                <Button className="mt-auto" onClick={() => start(l)}>{progress.done.includes(l.id) ? 'Dobara mashq' : 'Shuru karein'}</Button>
              </Card>
            );
          })}
        </div>

        <Card>
          <p className="font-urdu text-primary text-lg" dir="rtl">اصلی یا نقلی؟</p>
          <p className="font-bold text-xl">Fraud message pehchanein</p>
          {sq === null || sq === undefined ? (
            <div className="mt-3 space-y-2">
              {scamIdx !== null && <Notice tone="success">Aap ne {scamScore} / {SCAM_QUIZ.length} sahi pehchanay. Asli messages ke liye <Link className="underline font-semibold" href="/scam">Fraud check</Link> istemal karein.</Notice>}
              <Button onClick={() => { setScamIdx(0); setScamAnswer(null); setScamScore(0); }}>{scamIdx !== null ? 'Dobara khelein' : `${SCAM_QUIZ.length} message check karein`}</Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3 max-w-xl">
              <div className="rounded-2xl bg-surfaceAlt border border-border p-4">
                <p className="text-sm text-inkMuted">From: {sq.from}</p>
                <p className="text-ink">{sq.text}</p>
              </div>
              {scamAnswer === null ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => { setScamAnswer(false); if (!sq.scam) setScamScore((s) => s + 1); }}>Asli lagta hai</Button>
                  <Button variant="danger" onClick={() => { setScamAnswer(true); if (sq.scam) setScamScore((s) => s + 1); }}>Fraud hai</Button>
                </div>
              ) : (
                <>
                  <Notice tone={scamAnswer === sq.scam ? 'success' : 'warning'}><b>{scamAnswer === sq.scam ? 'Sahi! ' : 'Koi baat nahi, seekh rahe hain. '}</b>{sq.why}</Notice>
                  <Button onClick={() => { setScamAnswer(null); setScamIdx(scamIdx! + 1 < SCAM_QUIZ.length ? scamIdx! + 1 : SCAM_QUIZ.length); }}>Aagay</Button>
                </>
              )}
            </div>
          )}
        </Card>
        <Notice>Mashq ke baad apni <b>asli</b> bank app mein yahi kaam karein. Atak jayein to <Link href="/assistant" className="underline font-semibold">Saathi</Link> screenshot dekh kar madad karega.</Notice>
      </div>
    );
  }

  // ---------- Confidence check ----------
  if (phase === 'before' || phase === 'after') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-5 pt-6">
        <p className="font-urdu text-2xl text-primary" dir="rtl">{phase === 'before' ? 'شروع کرنے سے پہلے' : 'شاباش! مشق مکمل'}</p>
        <h1 className="text-2xl font-bold">{phase === 'before' ? `"${lesson.title}" khud karne mein kitna hausla hai?` : 'Ab khud karne mein kitna hausla hai?'}</h1>
        <div className="flex justify-center gap-2">
          {FACES.map((f, i) => (
            <button key={f} onClick={() => rate(i + 1)} aria-label={`${i + 1} out of 5`} className="h-16 w-16 text-4xl rounded-2xl border border-border hover:bg-primaryTint hover:border-primary">{f}</button>
          ))}
        </div>
        <p className="text-inkMuted">😟 bilkul nahi … 😄 poora hausla</p>
      </div>
    );
  }

  if (phase === 'done') {
    const b = progress.before[lesson.id], a = progress.after[lesson.id];
    return (
      <div className="max-w-xl mx-auto space-y-4 pt-4">
        <Card className="bg-successBg border-primaryLight">
          <p className="text-2xl font-bold text-primaryDark">Mubarak ho! Aap ne &quot;{lesson.title}&quot; seekh liya.</p>
          {b && a && <p className="text-lg mt-1">Hausla: {FACES[b - 1]} → {FACES[a - 1]}</p>}
          <p className="font-bold mt-4">Yaad rakhein:</p>
          <ol className="list-decimal ps-5 text-inkSecondary">{lesson.recap.map((r) => <li key={r}>{r}</li>)}</ol>
        </Card>
        <div className="flex gap-2 flex-wrap">
          <Link href="/assistant"><Button>Ab asli app mein karein (Saathi ke saath)</Button></Link>
          <Button variant="ghost" onClick={() => setLesson(null)}>Aur mashq</Button>
        </div>
      </div>
    );
  }

  // ---------- Simulator ----------
  const s = step as SimStep;
  const coach = lang === 'ur' ? s.coachUr : s.coach;
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-4 lg:order-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLesson(null)}>← Wapas</Button>
          <Badge tone="neutral">Qadam {idx + 1} / {lesson.steps.length}</Badge>
        </div>
        <div className="h-2 rounded-full bg-surfaceMuted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(idx / lesson.steps.length) * 100}%` }} /></div>
        <Card className="bg-surfaceAlt">
          <p className="text-sm text-inkMuted mb-1">Saathi kehta hai:</p>
          <p className={lang === 'ur' ? 'font-urdu text-[22px] leading-[2.3]' : 'text-[21px] font-semibold'} dir={lang === 'ur' ? 'rtl' : 'ltr'}>{coach}</p>
          <button onClick={() => speakUrdu(s.coachUr, s.coach)} className="text-primary font-semibold mt-2">🔊 Sunein</button>
          <p className="mt-3 text-[16px] text-inkSecondary"><b>Kyun?</b> {s.why}</p>
        </Card>
        {feedback && (
          <Notice tone={feedback.ok ? 'success' : 'warning'}>
            <p>{feedback.ok ? '✓ ' : ''}{feedback.text}</p>
            {feedback.ok && <Button className="mt-2" onClick={next}>Aagay chalein →</Button>}
          </Notice>
        )}
        <T ur="یہ نقلی ایپ ہے۔ غلطی سے کچھ خراب نہیں ہوگا۔" roman="Yeh naqli app hai. Ghalti se kuch kharab nahi hoga." className="text-inkMuted text-[16px]" />
      </div>

      <div className="lg:order-1 flex justify-center">
        <div className="w-[320px] rounded-[40px] border-[10px] border-ink bg-white shadow-card overflow-hidden relative" aria-label="Practice bank app">
          <div className="bg-inkSecondary text-white px-5 pt-6 pb-4">
            <p className="text-xs opacity-80">MASHQ BANK · practice only</p>
            <p className="text-lg font-semibold">{s.header ?? s.screen}</p>
          </div>
          <div className="p-4 min-h-[420px] space-y-3 text-[15px]">
            {s.body?.map((b) => <p key={b} className={/PKR \d/.test(b) && !b.includes(':') ? 'text-2xl font-bold' : 'text-ink'}>{b}</p>)}

            {s.kind === 'tap' && (
              <div className="grid grid-cols-2 gap-2">
                {s.buttons.map((b) => (
                  <button key={b.id}
                    onClick={() => b.id === s.correct ? right(b.explain) : miss(`Koi baat nahi! ${b.explain} Ab "${s.buttons.find((x) => x.id === s.correct)!.label}" dhoondein.`)}
                    disabled={feedback?.ok}
                    className={`rounded-xl border p-3 text-start min-h-[72px] ${wrong >= 2 && b.id === s.correct ? 'border-[3px] border-danger animate-pulse' : 'border-borderStrong'} hover:bg-surfaceAlt`}>
                    <span className="block text-xl" aria-hidden>{b.icon}</span>{b.label}
                  </button>
                ))}
              </div>
            )}

            {s.kind === 'input' && (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); value.replace(/[^\d]/g, '') === s.expected ? right('Sahi likha!') : miss(`Dobara dekhein. ${s.hint}`); }}>
                <label className="block text-sm text-inkMuted">{s.label}</label>
                <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className="w-full border-b-2 border-inkSecondary text-2xl py-2 focus:outline-none" disabled={feedback?.ok} />
                <button className="w-full rounded-xl bg-inkSecondary text-white py-3 font-semibold" disabled={feedback?.ok}>Next</button>
              </form>
            )}

            {s.kind === 'quiz' && (
              <div className="space-y-2">
                {s.popup && (
                  <div className="rounded-xl bg-ink text-white p-3 shadow-card">
                    <p className="text-sm opacity-80">{s.popup.from}</p>
                    <p>{s.popup.text}</p>
                  </div>
                )}
                <p className="font-semibold text-ink pt-2">{s.question}</p>
                {s.options.map((o) => (
                  <button key={o.text} disabled={feedback?.ok} onClick={() => (o.correct ? right(o.feedback) : miss(o.feedback))} className="w-full text-start rounded-xl border border-borderStrong p-3 hover:bg-surfaceAlt">{o.text}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
