'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/ImageUpload';
import { Badge, Button, Card, Input, Notice, PageHeader, Select, Stat, TextArea } from '@/components/ui';
import { T } from '@/components/LangProvider';
import { useStored } from '@/lib/storage';
import { findAnomalies, parseCsv, parseText, SAMPLE_CSV, summarize, type ParsedStatement } from '@/lib/statements/parse';
import { lookupFee } from '@/lib/statements/glossary';
import { CATEGORY_LABEL } from '@/lib/statements/labels';
import { rs } from '@/lib/format';
import type { Transaction, TxCategory } from '@/lib/types';
import { logActivity } from '@/lib/activity';

const SpendChart = dynamic(() => import('@/components/SpendChart'), { ssr: false, loading: () => <div className="h-64 rounded-xl bg-surfaceAlt animate-pulse" /> });

export default function StatementPage() {
  const [stmt, setStmt] = useStored<ParsedStatement | null>('statement', null);
  const [corrections, setCorrections] = useStored<Record<string, TxCategory>>('categoryCorrections', {});
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const load = (p: ParsedStatement) => {
    if (!p.transactions.length) { setError('Is file mein transactions nahi milin. CSV mein Date, Description, Debit, Credit, Balance columns hone chahiye.'); return; }
    setError(null);
    // apply remembered corrections
    p.transactions = p.transactions.map((t) => {
      const c = corrections[t.description.toLowerCase()];
      return c ? { ...t, category: c } : t;
    });
    setStmt(p);
    logActivity('Statement', 'shared', `Statement di: ${p.transactions.length} len-den parhi gayin. Account numbers aakhri 4 digits tak chhupa diye. Asal file save nahi hui.`);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError('File 5MB se choti honi chahiye.');
    const text = await f.text();
    load(f.name.toLowerCase().endsWith('.csv') ? parseCsv(text) : parseText(text));
  };

  const txs = stmt?.transactions ?? [];
  const summary = useMemo(() => summarize(txs), [txs]);
  const anomalies = useMemo(() => findAnomalies(txs), [txs]);
  const chart = Object.entries(summary.byCategory).map(([k, v]) => ({ name: CATEGORY_LABEL[k as TxCategory], value: Math.round(v) })).sort((a, b) => b.value - a.value);

  const recategorize = (t: Transaction, c: TxCategory) => {
    setCorrections((m) => ({ ...m, [t.description.toLowerCase()]: c }));
    setStmt((s) => (s ? { ...s, transactions: s.transactions.map((x) => (x.description === t.description ? { ...x, category: c } : x)) } : s));
  };

  /** Grounded Q&A: answers ONLY from parsed rows + glossary. */
  const ask = () => {
    const amt = q.match(/[\d,]+(\.\d+)?/)?.[0];
    const n = amt ? parseFloat(amt.replace(/,/g, '')) : null;
    const hits = txs.filter((t) => (n !== null && (Math.abs(t.debit - n) < 1 || Math.abs(t.credit - n) < 1)) || (!n && q.length > 2 && t.description.toLowerCase().includes(q.toLowerCase())));
    if (!hits.length) { setAnswer('Mujhe aap ki statement mein yeh nahi mila. Raqam dobara check karein, ya bank se poochein.'); return; }
    setAnswer(hits.map((t) => {
      const g = lookupFee(t.description);
      return `${t.date}: "${t.description}" ${t.debit ? rs(t.debit) + ' kata' : rs(t.credit) + ' aaya'}. Category: ${CATEGORY_LABEL[t.category]}. ${g ? g.roman : t.category === 'fee' ? 'Yeh charge hamari list mein nahi. Apne bank se is ke baare mein poochein.' : ''}`;
    }).join('\n'));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Statement samjhein" urdu="بینک اسٹیٹمنٹ کی ہر کٹوتی سمجھیں" subtitle="CSV ya statement ki photo upload karein. Original file save nahi hoti, account numbers aakhri 4 digits tak chhupa diye jatay hain." />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <p className="font-bold mb-2">1. Bank ki file (CSV)</p>
          <label className="block">
            <span className="sr-only">Statement file</span>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-[16px] file:me-3 file:min-h-[44px] file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-white file:font-semibold" />
          </label>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => load(parseCsv(SAMPLE_CSV))}>Sample statement try karein</Button>
        </Card>
        <Card>
          <p className="font-bold mb-2">2. Statement ki photo / screenshot</p>
          <ImageUpload feature="Statement" compact withOcr onImage={(img) => { if (img.ocr) load(parseText(img.ocr.text)); else setError('Photo se text nahi parh saka. CSV try karein.'); }} />
        </Card>
        <Card>
          <p className="font-bold mb-2">3. Paste karein</p>
          <TextArea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="02/10/2026 ATM CASH WITHDRAWAL 5,000.00 DR 132,000.00" />
          <Button variant="ghost" className="mt-2 w-full" onClick={() => load(paste.includes(',') && /debit/i.test(paste) ? parseCsv(paste) : parseText(paste))} disabled={!paste.trim()}>Analyze</Button>
        </Card>
      </div>
      {error && <Notice tone="danger">{error}</Notice>}

      {stmt && (
        <>
          {stmt.integrityOk === false && <Notice tone="warning"><b>Hisaab poora nahi mila.</b> Kuch lines shayad theek se parh nahi saka. Laal lines ko apni statement se mila lein.</Notice>}
          {stmt.integrityOk === true && <Notice tone="success">✓ Hisaab poora mil gaya: shuru ka balance {rs(stmt.openingBalance!)} + aaye − gaye = aakhri balance {rs(stmt.closingBalance!)}. Har line sahi parhi gayi.</Notice>}
          {stmt.integrityOk === null && <Notice tone="warning">Is file mein balance nahi likha, is liye hisaab mila kar check nahi ho saka.</Notice>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Money in (aaya)" value={rs(summary.moneyIn)} tone="success" />
            <Stat label="Money out (gaya)" value={rs(summary.moneyOut)} tone="danger" />
            <Stat label="Bank fees aur tax" value={rs(summary.totalFees)} />
            <Stat label="Len-den (lines)" value={String(txs.length)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <p className="font-bold mb-3">Paise kahan gaye?</p>
              <div className="h-64"><SpendChart data={chart} /></div>
            </Card>
            <Card>
              <p className="font-bold mb-3">Fees aur katautiyan (har ek ki wazahat)</p>
              <ul className="space-y-3">
                {summary.feeLines.map(({ tx, glossary }) => (
                  <li key={tx.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex justify-between gap-2"><span className="font-semibold text-ink">{tx.description}</span><span className="text-danger font-semibold shrink-0">{rs(tx.debit)}</span></div>
                    {glossary ? (
                      <>
                        <T ur={glossary.ur} roman={glossary.roman} className="text-inkSecondary" />
                        <p className="text-xs text-inkMuted mt-1">Source: {glossary.source} · Last verified: {glossary.lastVerified ?? 'not yet verified'}</p>
                      </>
                    ) : (
                      <Badge tone="warning">Ask your bank about this</Badge>
                    )}
                  </li>
                ))}
                {!summary.feeLines.length && <p className="text-inkMuted">Koi fee nahi mili.</p>}
              </ul>
            </Card>
          </div>

          {anomalies.length > 0 && (
            <Card>
              <p className="font-bold mb-2 text-warning">Dhyan dein</p>
              <ul className="space-y-1">{anomalies.map((a) => { const t = txs.find((x) => x.id === a.txId)!; return <li key={a.txId + a.reason}>{t.date} · {t.description} · {rs(t.debit)}: <b>{a.reason}</b></li>; })}</ul>
            </Card>
          )}

          <Card>
            <p className="font-bold mb-2">Statement se poochein</p>
            <div className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yeh Rs. 150 ka charge kya hai?" onKeyDown={(e) => e.key === 'Enter' && ask()} /><Button onClick={ask}>Poochein</Button></div>
            {answer && <p className="mt-3 whitespace-pre-line bg-surfaceAlt rounded-xl p-3 text-inkSecondary">{answer}</p>}
            <p className="text-xs text-inkMuted mt-2">Jawab sirf aap ki statement aur fee glossary se diya jata hai.</p>
          </Card>

          <Card className="overflow-x-auto">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <p className="font-bold">Saari len-den</p>
              <Link href="/ledger" className="text-primary font-semibold hover:underline">Kharcha diary se milayein →</Link>
            </div>
            <table className="w-full text-[15px] min-w-[640px]">
              <thead><tr className="text-start text-inkMuted border-b border-border"><th className="text-start py-2">Date</th><th className="text-start">Description</th><th className="text-end">Debit</th><th className="text-end">Credit</th><th className="text-start ps-3">Category</th></tr></thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className={`border-b border-border ${stmt.suspectRowIds.includes(t.id) ? 'bg-dangerBg' : ''}`}>
                    <td className="py-2 whitespace-nowrap">{t.date}</td>
                    <td>{t.description}</td>
                    <td className="text-end text-danger">{t.debit ? rs(t.debit) : ''}</td>
                    <td className="text-end text-success">{t.credit ? rs(t.credit) : ''}</td>
                    <td className="ps-3 py-1">
                      <Select value={t.category} onChange={(e) => recategorize(t, e.target.value as TxCategory)} className="!min-h-[40px] !py-1 text-[14px]" aria-label="Category">
                        {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
