'use client';
import { useState } from 'react';
import Link from 'next/link';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import { Badge, Button, Card, Input, Notice, PageHeader, Select, TextArea } from '@/components/ui';
import { useStored } from '@/lib/storage';
import { listen, useSpeechSupported } from '@/lib/speech';
import { logActivity, updateImageMeta } from '@/lib/activity';
import { applyRates, changeBack, parseLine, parseList, problemOf, rateUnit, total, unitLabel, type SaudaItem, type Unit } from '@/lib/sauda/parse';
import { rs, today, uid } from '@/lib/format';
import { apiPost } from '@/lib/api';
import type { LedgerEntry } from '@/lib/types';

const UNITS: Unit[] = ['kg', 'g', 'litre', 'ml', 'dozen', 'piece', 'packet'];

function Question({ it, onFix, onRemove }: { it: SaudaItem; onFix: (next: SaudaItem, rememberRate?: boolean) => void; onRemove: () => void }) {
  const [a, setA] = useState('');
  const [u, setU] = useState<Unit>(it.unit ?? 'kg');
  const q =
    it.problem === 'unreadable' ? `Yeh line samajh nahi aayi: "${it.raw}". Is mein kya likha hai?`
    : it.problem === 'no_qty' ? `"${it.name}" kitna chahiye?`
    : `"${it.name}" ka rate kya hai? (1 ${unitLabel(rateUnit(it.unit))} ka)`;
  const submit = () => {
    if (!a.trim()) return;
    if (it.problem === 'unreadable') { const p = parseLine(a); onFix({ ...p, id: it.id }); return; }
    const n = parseFloat(a.replace(/[^\d.]/g, ''));
    if (!n || n <= 0) return;
    if (it.problem === 'no_qty') { const next = { ...it, qty: n, unit: u }; onFix({ ...next, problem: problemOf(next) }); }
    else { const next = { ...it, rate: n }; onFix({ ...next, problem: problemOf(next) }, true); }
  };
  return (
    <li className="rounded-xl border-2 border-warning/50 bg-warningBg p-4 space-y-2">
      <p className="font-semibold text-ink">❓ {q}</p>
      <div className="flex gap-2 flex-wrap">
        <Input className="!w-auto flex-1 min-w-[140px]" value={a} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={it.problem === 'unreadable' ? 'Maslan: 2 kg aata' : it.problem === 'no_qty' ? 'Maslan: 2' : 'Rs, maslan 160'} inputMode={it.problem === 'unreadable' ? 'text' : 'decimal'} aria-label={q} />
        {it.problem === 'no_qty' && <Select className="!w-auto" value={u} onChange={(e) => setU(e.target.value as Unit)} aria-label="Unit">{UNITS.map((x) => <option key={x} value={x}>{unitLabel(x)}</option>)}</Select>}
        <Button onClick={submit}>Theek hai</Button>
        <Button variant="ghost" onClick={onRemove}>Hata dein</Button>
      </div>
    </li>
  );
}

export default function SaudaPage() {
  const canSpeak = useSpeechSupported();
  const [text, setText] = useState('');
  const [items, setItems] = useState<SaudaItem[] | null>(null);
  const [rates, setRates] = useStored<Record<string, number>>('saudaRates', {});
  const [, setLedger] = useStored<LedgerEntry[]>('ledger', []);
  const [listening, setListening] = useState(false);
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const calc = (t = text) => {
    const parsed = applyRates(parseList(t), rates);
    setItems(parsed);
    logActivity('Sauda', 'shared', `Sauda list di (${parsed.length} cheezein): ${parsed.map((p) => p.raw).join(', ').slice(0, 300)}`);
  };

  const voice = () => {
    if (listening) return;
    const stop = listen('ur-PK', (t) => {
      setText((x) => {
        const next = (x ? x + '\n' : '') + t;
        calc(next);
        return next;
      });
      setListening(false);
    }, () => setListening(false));
    if (stop) setListening(true);
  };

  const fromPhoto = async (img: UploadedImage) => {
    setReading(true);
    try {
      let lines: string[] | null = null;
      try {
        const { data: d } = await apiPost<{ lines: string[] | null; sentToAI?: boolean }>('/api/parchi', { image: img.dataUrl });
        updateImageMeta(img.logId, { sentToAI: !!d.sentToAI });
        lines = d.lines;
      } catch { /* offline: use OCR */ }
      const t = lines?.join('\n') ?? img.ocr?.text ?? '';
      if (!t.trim()) { setNote('Parchi parh nahi saka. Likh kar ya bol kar dein.'); return; }
      setText(t);
      setNote(lines ? 'Parchi parh li. Neeche check karein, jo samajh nahi aaya woh main poochunga.' : 'Haath ki likhai parhna mushkil hai: jo samajh nahi aaya woh main poochunga.');
      calc(t);
    } finally { setReading(false); }
  };

  const fix = (id: string, next: SaudaItem, rememberRate?: boolean) => {
    setItems((xs) => xs!.map((x) => (x.id === id ? next : x)));
    if (rememberRate && next.rate) {
      setRates((r) => ({ ...r, [next.name]: next.rate! }));
      logActivity('Sauda', 'shared', `Aap ne bataya: ${next.name} ka rate Rs ${next.rate} (1 ${unitLabel(rateUnit(next.unit))}). Agli baar yaad rahega.`);
    }
  };

  const t = items ? total(items) : null;
  const ch = t && paid ? changeBack(parseFloat(paid) || 0, t.sum) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Sauda ka hisaab" urdu="سودے کی لسٹ دیں، حساب ساتھ سیکھیں" subtitle="Likh kar, bol kar ya parchi ki photo se list dein. Jo samajh na aaye, Saathi poochega. Har cheez ka hisaab qadam ba qadam dikhega." />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <p className="font-bold">List likhein ya bolein</p>
          <TextArea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'2 kg aata\naadha kilo dahi\ndoodh 1 litre @ 220\nek darjan anday\nnamak 60'} aria-label="Sauda list" />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => calc()} disabled={!text.trim()}>Hisaab lagayein</Button>
            {canSpeak && <Button variant={listening ? 'danger' : 'secondary'} onClick={voice}>🎙 {listening ? 'Sun raha hoon…' : 'Bol kar likhein'}</Button>}
          </div>
          <p className="text-sm text-inkMuted">Har cheez nayi line par. Rate aik dafa batayein, agli baar yaad rahega.</p>
        </Card>
        <Card>
          <p className="font-bold mb-2">Parchi ki photo</p>
          <ImageUpload feature="Sauda" withOcr label="Sauda ki parchi" hint="Saaf roshni mein, seedhi photo lein." onImage={fromPhoto} />
          {reading && <p className="text-primaryDark mt-2" role="status">Parchi parh raha hoon…</p>}
        </Card>
      </div>
      {note && <Notice>{note}</Notice>}

      {items && t && (
        <>
          {t.pending.length > 0 && (
            <Card>
              <p className="font-bold text-lg mb-3">Mujhe yeh batayein ({t.pending.length})</p>
              <ul className="space-y-3">
                {t.pending.map((it) => <Question key={it.id} it={it} onFix={(n, r) => fix(it.id, n, r)} onRemove={() => setItems((xs) => xs!.filter((x) => x.id !== it.id))} />)}
              </ul>
            </Card>
          )}

          <Card>
            <p className="font-bold text-lg mb-3">Hisaab kaise bana</p>
            <ol className="space-y-2">
              {t.lines.map((l, i) => (
                <li key={l.item.id} className="flex justify-between gap-3 border-b border-border pb-2">
                  <span><b>{i + 1}. {l.item.name}</b> <span className="text-inkSecondary">· {l.working}</span></span>
                  <span className="font-bold shrink-0">{rs(l.amount)}</span>
                </li>
              ))}
            </ol>
            {t.lines.length > 1 && (
              <div className="mt-3 rounded-xl bg-surfaceAlt p-3 text-[16px] text-inkSecondary space-y-0.5">
                <p className="font-semibold text-ink">Jor (step by step):</p>
                {t.lines.slice(1).reduce<{ acc: number; rows: string[] }>((s, l) => {
                  const next = Math.round((s.acc + l.amount) * 100) / 100;
                  return { acc: next, rows: [...s.rows, `${s.acc} + ${l.amount} = ${next}`] };
                }, { acc: t.lines[0].amount, rows: [] }).rows.map((r) => <p key={r}>{r}</p>)}
              </div>
            )}
            <div className="mt-4 flex items-end justify-between flex-wrap gap-2">
              <div>
                <p className="text-inkMuted">Kul (total){t.pending.length ? ' (abhi baqi cheezon ke baghair)' : ''}</p>
                <p className="text-4xl font-bold text-primaryDark">{rs(t.sum)}</p>
              </div>
              {t.pending.length > 0 && <Badge tone="warning">{t.pending.length} cheezein baqi</Badge>}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="font-bold">Dukandar ko kitne paise de rahe hain?</p>
            <Input inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="Maslan 1000" aria-label="Diye gaye paise" />
            {ch && (ch.change < 0
              ? <Notice tone="warning">Rs {-ch.change} kam hain.</Notice>
              : <Notice tone="success"><b>Wapas milne chahiye: {rs(ch.change)}</b> ({paid} − {t.sum}){ch.notes.length > 0 && <span className="block mt-1">Note gin lein: {ch.notes.map((n) => `${n.count} × ${n.note}`).join(' + ')}</span>}</Notice>)}
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" disabled={!t.sum} onClick={() => {
                setLedger((l) => [{ id: uid(), amount: Math.round(t.sum), date: today(), source: 'other', purpose: 'groceries', note: 'Sauda' }, ...l]);
                logActivity('Sauda', 'action', `Sauda ${rs(t.sum)} kharcha diary mein likha.`);
                setNote('✓ Kharcha diary mein likh diya (Rashan).');
              }}>Kharcha diary mein likhein</Button>
              <Link href="/ledger"><Button variant="ghost">Diary dekhein</Button></Link>
            </div>
          </Card>
        </>
      )}

      {Object.keys(rates).length > 0 && (
        <Card>
          <p className="font-bold mb-2">Yaad rakhe gaye rate</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {Object.entries(rates).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded-xl bg-surfaceAlt px-3 py-2">
                <span>{k}: <b>Rs {v}</b></span>
                <button className="text-danger text-sm font-semibold" onClick={() => setRates((r) => { const n = { ...r }; delete n[k]; return n; })}>Hatayein</button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-inkMuted mt-2">Rate badal jayein to hata dein, Saathi dobara poochega.</p>
        </Card>
      )}
    </div>
  );
}
