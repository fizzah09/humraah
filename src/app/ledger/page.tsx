'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Field, Input, Notice, PageHeader, Select, Stat, TextArea } from '@/components/ui';
import { useStored } from '@/lib/storage';
import { reconcile } from '@/lib/ledger/reconcile';
import { guessPurpose, parseAmount, parseDebitSms } from '@/lib/ledger/quickparse';
import { PURPOSES, SOURCES, purposeLabel } from '@/lib/ledger/labels';
import { listen, useSpeechSupported } from '@/lib/speech';
import { rs, today, uid } from '@/lib/format';
import type { LedgerEntry, LedgerSource, Purpose } from '@/lib/types';
import type { ParsedStatement } from '@/lib/statements/parse';
import { logActivity } from '@/lib/activity';

export default function LedgerPage() {
  const [entries, setEntries] = useStored<LedgerEntry[]>('ledger', []);
  const canSpeak = useSpeechSupported();
  const [stmt] = useStored<ParsedStatement | null>('statement', null);
  const [overrides, setOverrides] = useStored<Record<string, string | null>>('matchOverrides', {});
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<LedgerSource>('atm');
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [sms, setSms] = useState('');
  const [listening, setListening] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const txs = stmt?.transactions ?? [];
  const result = useMemo(() => reconcile(entries, txs, overrides), [entries, txs, overrides]);

  const reset = () => { setAmount(''); setPurpose(null); setNote(''); setDate(today()); setEditing(null); };

  const submit = () => {
    const a = parseAmount(amount);
    if (!a) return setMsg('Raqam likhein, maslan 5000 ya "paanch hazaar".');
    const p = purpose ?? 'other';
    if (editing) {
      setEntries((es) => es.map((e) => (e.id === editing ? { ...e, amount: a, source, purpose: p, note, date } : e)));
    } else {
      setEntries((es) => [{ id: uid(), amount: a, source, purpose: p, note: note || undefined, date }, ...es]);
    }
    setMsg(`✓ ${rs(a)} · ${purposeLabel(p).label} save ho gaya.`);
    logActivity('Kharcha diary', 'shared', `${editing ? 'Entry badli' : 'Kharcha likha'}: ${rs(a)}, ${purposeLabel(p).label}${note ? ` (${note})` : ''}, ${date}.`);
    reset();
  };

  const voice = () => {
    if (listening) return;
    const stop = listen('ur-PK', (t) => {
      const a = parseAmount(t);
      if (a) setAmount(String(a));
      const p = guessPurpose(t);
      if (p) setPurpose(p);
      setNote(t);
      setListening(false);
      if (a) {
        setMsg(`Awaaz se raqam darj ho gayi: Rs. ${a}. Niche "Kharcha likhein" par tap karein.`);
      } else {
        setMsg(`Awaaz suni: "${t}". Raqam khud likh dein.`);
      }
    }, () => setListening(false), (err) => {
      setListening(false);
      if (err === 'not-allowed') setMsg('Microphone ki ijazat dein (address bar se allow karein).');
    });
    if (stop) {
      setListening(true);
      setMsg('Bol kar batayein (jaise: "paanch hazaar rashan")...');
    }
  };

  const fromSms = () => {
    const r = parseDebitSms(sms);
    if (r.amount) setAmount(String(r.amount));
    setSource(r.source);
    if (r.date) setDate(r.date);
    setSms('');
    setMsg(r.amount ? 'SMS se raqam bhar di. Ab maqsad chunein.' : 'SMS mein raqam nahi mili.');
  };

  const explainTx = (txId: string, p: Purpose) => {
    const t = txs.find((x) => x.id === txId)!;
    const e: LedgerEntry = { id: uid(), amount: t.debit, date: t.date, source: t.category === 'atm' ? 'atm' : 'transfer', purpose: p };
    setEntries((es) => [e, ...es]);
    setOverrides((o) => ({ ...o, [e.id]: t.id }));
  };

  const byPurpose = useMemo(() => {
    const m: Record<string, number> = {};
    for (const mt of result.matches) {
      const e = entries.find((x) => x.id === mt.entryId);
      const t = txs.find((x) => x.id === mt.txId);
      if (e && t) m[e.purpose] = (m[e.purpose] ?? 0) + t.debit;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [result, entries, txs]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kharcha diary" urdu="پیسے کیوں نکالے؟ ابھی لکھ لیں" subtitle="Paise nikalte waqt 10 second mein likhein. Mahine ke aakhir mein statement se khud match ho jayega." />

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg">{editing ? 'Entry edit karein' : 'Jaldi likhein'}</p>
            {canSpeak && (
              <Button variant={listening ? 'danger' : 'secondary'} onClick={voice} aria-label="Voice entry">🎙 {listening ? 'Sun raha hoon…' : 'Bol kar likhein'}</Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Raqam (amount)" hint='5000 ya "paanch hazaar"'><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" className="text-2xl font-bold" /></Field>
            <Field label="Tareekh"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <div>
            <p className="text-inkSecondary font-medium mb-1.5">Kahan se?</p>
            <div className="flex gap-2 flex-wrap">
              {SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSource(s.id)} className={`px-4 min-h-[44px] rounded-xl border font-medium ${source === s.id ? 'bg-primary text-white border-primary' : 'border-borderStrong text-inkSecondary hover:bg-surfaceAlt'}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-inkSecondary font-medium mb-1.5">Kis liye?</p>
            <div className="grid grid-cols-4 gap-2">
              {PURPOSES.map((p) => (
                <button key={p.id} onClick={() => setPurpose(p.id)} className={`min-h-[64px] rounded-xl border flex flex-col items-center justify-center text-[15px] ${purpose === p.id ? 'bg-primaryTint border-primary text-primaryDark font-semibold' : 'border-border text-inkSecondary hover:bg-surfaceAlt'}`}>
                  <span className="text-xl" aria-hidden>{p.emoji}</span>{p.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghar ka rashan" /></Field>
          <div className="flex gap-2">
            <Button onClick={submit} className="flex-1">{editing ? 'Update' : 'Save karein'}</Button>
            {editing && <Button variant="ghost" onClick={reset}>Cancel</Button>}
          </div>
          {msg && <Notice tone="success">{msg}</Notice>}
          <details className="text-[16px]">
            <summary className="cursor-pointer text-primary font-semibold">Bank ka debit SMS paste karein</summary>
            <TextArea rows={2} className="mt-2" value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Rs.5,000.00 withdrawn via ATM from A/C ****1234 on 02-10-2026" />
            <Button variant="ghost" className="mt-2" onClick={fromSms} disabled={!sms.trim()}>SMS se bharein</Button>
          </details>
        </Card>

        <Card className="lg:col-span-2">
          <p className="font-bold text-lg mb-3">Meri entries ({entries.length})</p>
          <ul className="space-y-2 max-h-[520px] overflow-y-auto">
            {entries.map((e) => {
              const m = result.matches.find((x) => x.entryId === e.id);
              return (
                <li key={e.id} className="rounded-xl border border-border p-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{rs(e.amount)} <span className="font-normal text-inkMuted">· {purposeLabel(e.purpose).emoji} {purposeLabel(e.purpose).label}</span></span>
                    {txs.length > 0 && (m ? <Badge tone="success">Mil gaya</Badge> : <Badge tone="warning">Nahi mila</Badge>)}
                  </div>
                  <p className="text-sm text-inkMuted">{e.date} · {SOURCES.find((s) => s.id === e.source)?.label}{e.note ? ` · ${e.note}` : ''}</p>
                  <div className="flex gap-3 mt-1 text-sm">
                    <button className="text-primary font-semibold" onClick={() => { setEditing(e.id); setAmount(String(e.amount)); setSource(e.source); setPurpose(e.purpose); setNote(e.note ?? ''); setDate(e.date); }}>Edit</button>
                    <button className="text-danger font-semibold" onClick={() => setEntries((es) => es.filter((x) => x.id !== e.id))}>Delete</button>
                  </div>
                </li>
              );
            })}
            {!entries.length && <p className="text-inkMuted">Abhi koi entry nahi.</p>}
          </ul>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold">Mahine ka hisaab</h2>
          {txs.length > 0 && <Button variant="ghost" className="no-print" onClick={() => window.print()}>Report PDF / print</Button>}
        </div>
        {!txs.length ? (
          <Notice>Pehle <Link href="/statement" className="text-primary font-semibold underline">statement upload karein</Link>, phir yahan har withdrawal ka maqsad dikhega.</Notice>
        ) : (
          <>
            <div className="rounded-xl2 bg-primary text-white p-6">
              <p className="text-primaryTint">Cash & transfers</p>
              <p className="text-3xl font-bold">{rs(result.totalCashOut)} nikalay, {rs(result.explained)} explained ({result.percentExplained}%)</p>
              <div className="h-3 rounded-full bg-white/20 mt-3 overflow-hidden"><div className="h-full bg-primaryLight" style={{ width: `${result.percentExplained}%` }} /></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label="Mil gaye" value={String(result.matches.length)} tone="success" />
              <Stat label="Statement mein, ledger mein nahi" value={String(result.unexplainedTx.length)} tone="danger" />
              <Stat label="Ledger mein, statement mein nahi" value={String(result.unmatchedEntries.length)} />
            </div>

            {result.unexplainedTx.length > 0 && (
              <Card>
                <p className="font-bold mb-3">Yeh paise kis liye thay? (2 tap)</p>
                <ul className="space-y-3">
                  {result.unexplainedTx.map((t) => (
                    <li key={t.id} className="border-b border-border pb-3 last:border-0">
                      <p><b>{rs(t.debit)}</b> · {t.date} · <span className="text-inkMuted">{t.description}</span></p>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {PURPOSES.map((p) => <button key={p.id} onClick={() => explainTx(t.id, p.id)} className="px-3 py-1.5 rounded-full bg-surfaceAlt border border-border text-[15px] hover:bg-primaryTint">{p.emoji} {p.label}</button>)}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {result.unmatchedEntries.length > 0 && (
              <Card>
                <p className="font-bold mb-2">Aap ne likha, lekin statement mein nahi mila</p>
                <p className="text-inkMuted text-[16px] mb-3">Raqam ya tareekh check karein, ya khud match karein.</p>
                <ul className="space-y-2">
                  {result.unmatchedEntries.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 flex-wrap">
                      <span><b>{rs(e.amount)}</b> · {e.date} · {purposeLabel(e.purpose).label}</span>
                      <Select className="!w-auto !min-h-[40px] text-[15px]" value="" onChange={(ev) => setOverrides((o) => ({ ...o, [e.id]: ev.target.value }))} aria-label="Match manually">
                        <option value="">Khud match karein…</option>
                        {txs.filter((t) => t.debit > 0 && !result.matches.some((m) => m.txId === t.id)).map((t) => <option key={t.id} value={t.id}>{t.date} · {rs(t.debit)} · {t.description.slice(0, 30)}</option>)}
                      </Select>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <p className="font-bold mb-3">Mil gaye (aur kyun mile)</p>
                <ul className="space-y-2">
                  {result.matches.map((m) => {
                    const e = entries.find((x) => x.id === m.entryId)!;
                    const t = txs.find((x) => x.id === m.txId)!;
                    if (!e || !t) return null;
                    const fees = m.feeTxIds.map((id) => txs.find((x) => x.id === id)!).filter(Boolean);
                    return (
                      <li key={m.entryId} className="rounded-xl bg-surfaceAlt p-3">
                        <p><b>{rs(t.debit)}</b> {t.category.toUpperCase()}, <span className="text-primaryDark font-semibold">{purposeLabel(e.purpose).label}</span>{e.note ? ` (${e.note})` : ''}</p>
                        <p className="text-sm text-inkMuted">{t.date} · {m.reason}{fees.length ? ` · + fee ${fees.map((f) => rs(f.debit)).join(', ')}` : ''}</p>
                        <button className="text-sm text-danger font-semibold" onClick={() => setOverrides((o) => ({ ...o, [e.id]: null }))}>Yeh match galat hai</button>
                        {result.ambiguous.some((a) => a.entryId === e.id) && <p className="text-sm text-warning">Isi din isi raqam ki aur entry bhi hai. Check karein.</p>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
              <Card>
                <p className="font-bold mb-3">Maqsad ke hisaab se kharcha</p>
                <ul className="space-y-2">
                  {byPurpose.map(([p, v]) => (
                    <li key={p}>
                      <div className="flex justify-between"><span>{purposeLabel(p as Purpose).emoji} {purposeLabel(p as Purpose).label}</span><b>{rs(v)}</b></div>
                      <div className="h-2 rounded-full bg-surfaceMuted mt-1"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / (byPurpose[0]?.[1] || 1)) * 100}%` }} /></div>
                    </li>
                  ))}
                  {!byPurpose.length && <p className="text-inkMuted">Abhi kuch match nahi hua.</p>}
                </ul>
              </Card>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
