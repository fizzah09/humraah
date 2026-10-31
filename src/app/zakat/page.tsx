'use client';
import { useMemo, useState } from 'react';
import { Button, Card, Field, Input, Notice, PageHeader, Select } from '@/components/ui';
import { useStored } from '@/lib/storage';
import { calculateZakat, FALLBACK_PRICES, NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, type NisabBasis, type Prices, type ZakatInputs } from '@/lib/zakat/calc';
import type { ParsedStatement } from '@/lib/statements/parse';
import { rs } from '@/lib/format';
import { logActivity } from '@/lib/activity';

const EMPTY: ZakatInputs = { cash: 0, bank: 0, goldGrams: 0, goldKarat: 24, silverGrams: 0, businessStock: 0, receivables: 0, investments: 0, liabilities: 0 };

export default function ZakatPage() {
  const [inputs, setInputs] = useStored<ZakatInputs>('zakatInputs', EMPTY);
  const [prices, setPrices] = useStored<Prices>('zakatPrices', FALLBACK_PRICES);
  const [basis, setBasis] = useStored<NisabBasis>('nisabBasis', 'silver');
  const [zakatDate, setZakatDate] = useStored<string>('zakatDate', '');
  const [stmt] = useStored<ParsedStatement | null>('statement', null);
  const [tola, setTola] = useState(false);

  const r = useMemo(() => calculateZakat(inputs, prices, basis), [inputs, prices, basis]);
  const set = (k: keyof ZakatInputs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let v = parseFloat(e.target.value) || 0;
    if (tola && (k === 'goldGrams' || k === 'silverGrams')) v = v * 11.664;
    setInputs((i) => ({ ...i, [k]: v }));
  };
  const show = (k: keyof ZakatInputs) => {
    const v = inputs[k];
    if (tola && (k === 'goldGrams' || k === 'silverGrams')) return v ? +(v / 11.664).toFixed(2) : '';
    return v || '';
  };

  const money: [keyof ZakatInputs, string][] = [
    ['cash', 'Ghar mein cash'], ['bank', 'Bank balances'], ['businessStock', 'Karobari maal (stock)'],
    ['receivables', 'Qarz jo wapas milna hai'], ['investments', 'Investments / shares'], ['liabilities', 'Qarz jo dena hai (short-term)'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Zakat ka hisaab" urdu="زکوٰۃ کا آسان حساب" subtitle="Yeh sirf hisaab hai, fatwa nahi. Ulama ki raaye kuch baton par mukhtalif hai, apne aalim se mashwara karein." />
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {money.map(([k, l]) => <Field key={k} label={l}><Input inputMode="decimal" type="number" min={0} value={show(k)} onChange={set(k)} placeholder="0" /></Field>)}
          </div>
          {stmt?.closingBalance != null && (
            <Button variant="ghost" onClick={() => setInputs((i) => ({ ...i, bank: stmt.closingBalance! }))}>Statement ka closing balance use karein ({rs(stmt.closingBalance)})</Button>
          )}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2"><p className="font-bold">Sona aur chandi</p>
              <label className="flex items-center gap-2 text-[16px]"><input type="checkbox" checked={tola} onChange={(e) => setTola(e.target.checked)} className="h-5 w-5 accent-primary" />Tola mein</label>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label={`Gold (${tola ? 'tola' : 'grams'})`}><Input type="number" min={0} value={show('goldGrams')} onChange={set('goldGrams')} /></Field>
              <Field label="Karat"><Select value={inputs.goldKarat} onChange={set('goldKarat')}>{[24, 22, 21, 18].map((k) => <option key={k} value={k}>{k}K</option>)}</Select></Field>
              <Field label={`Silver (${tola ? 'tola' : 'grams'})`}><Input type="number" min={0} value={show('silverGrams')} onChange={set('silverGrams')} /></Field>
            </div>
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <p className="font-bold">Aaj ke rates</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Gold 24K per gram (Rs.)"><Input type="number" value={prices.gold24PerGram} onChange={(e) => setPrices({ ...prices, gold24PerGram: +e.target.value, source: 'Manual entry', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ') })} /></Field>
              <Field label="Silver per gram (Rs.)"><Input type="number" value={prices.silverPerGram} onChange={(e) => setPrices({ ...prices, silverPerGram: +e.target.value, source: 'Manual entry', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ') })} /></Field>
            </div>
            <p className="text-sm text-inkMuted">Source: {prices.source} · {prices.timestamp}. Live price API ke liye README dekhein.</p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="font-bold mb-2">Nisab kis base par?</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {(['silver', 'gold'] as NisabBasis[]).map((b) => (
                <button key={b} onClick={() => setBasis(b)} className={`text-start rounded-xl border p-3 ${basis === b ? 'border-primary bg-primaryTint' : 'border-border hover:bg-surfaceAlt'}`}>
                  <p className="font-semibold">{b === 'silver' ? `Chandi: ${NISAB_SILVER_GRAMS}g (52.5 tola)` : `Sona: ${NISAB_GOLD_GRAMS}g (7.5 tola)`}</p>
                  <p className="text-sm text-inkMuted">{b === 'silver' ? 'Kam threshold, zyada log zakat dete hain. (Default assumption)' : 'Zyada threshold.'}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className={`rounded-xl2 p-6 ${r.meetsNisab ? 'bg-primary text-white' : 'bg-surfaceAlt border border-border'}`}>
            <p className={r.meetsNisab ? 'text-primaryTint' : 'text-inkMuted'}>Zakat wajib (2.5%)</p>
            <p className="text-4xl font-bold">{rs(r.zakatDue)}</p>
            <p className={`mt-2 ${r.meetsNisab ? 'text-primaryTint' : 'text-inkSecondary'}`}>{r.meetsNisab ? 'Aap ka maal nisab se zyada hai.' : `Nisab (${rs(r.nisab)}) tak nahi pohncha, zakat wajib nahi.`}</p>
          </div>
          <Card className="space-y-2">
            <p className="font-urdu text-primary text-lg" dir="rtl">آپ کی زکوٰۃ کا مطلب</p>
            <p className="font-bold">Aasaan alfaaz mein</p>
            <ol className="list-decimal ps-5 space-y-1.5 text-inkSecondary">
              <li>Aap ke paas kul <b>{rs(r.totalAssets)}</b> ka maal hai (cash, bank, sona, chandi waghera).</li>
              {r.liabilities > 0 && <li>Is mein se <b>{rs(r.liabilities)}</b> qarz minus kiya, to <b>{rs(r.net)}</b> bacha.</li>}
              <li>Nisab ({r.nisabBasis === 'silver' ? '52.5 tola chandi' : '7.5 tola sona'} ki qeemat) <b>{rs(r.nisab)}</b> hai. {r.meetsNisab ? 'Aap ka maal is se zyada hai, is liye zakat farz hai.' : 'Aap ka maal is se kam hai, is liye is saal zakat farz nahi.'}</li>
              {r.meetsNisab && <li>Zakat 2.5% hai, yaani <b>har 100 rupay mein se 2.50 rupay</b>. {rs(r.net)} × 2.5% = <b>{rs(r.zakatDue)}</b>.</li>}
              {r.meetsNisab && r.zakatDue > 0 && <li>Maslan: {rs(r.zakatDue)} ko aap {Math.max(1, Math.round(r.zakatDue / 5000))} hisson mein (har ek ~{rs(r.zakatDue / Math.max(1, Math.round(r.zakatDue / 5000)))}) mustahiq logon ko de sakte hain.</li>}
              <li>Zakat saal mein aik dafa, apni zakat ki tareekh par di jati hai, jab maal par poora (qamri) saal guzar jaye.</li>
            </ol>
            <Button variant="secondary" className="no-print" onClick={() => logActivity('Zakat', 'shared', `Zakat ka hisaab kiya: kul maal ${rs(r.totalAssets)}, qarz ${rs(r.liabilities)}, nisab (${r.nisabBasis}) ${rs(r.nisab)}, zakat ${rs(r.zakatDue)}.`)}>History mein save karein</Button>
          </Card>
          <Card>
            <p className="font-bold mb-2">Breakdown</p>
            <table className="w-full text-[16px]">
              <tbody>
                {r.lines.map((l) => <tr key={l.label} className="border-b border-border"><td className="py-1.5">{l.label}</td><td className="text-end">{rs(l.value)}</td></tr>)}
                <tr className="font-semibold"><td className="py-1.5">Total assets</td><td className="text-end">{rs(r.totalAssets)}</td></tr>
                <tr><td className="py-1.5">− Liabilities</td><td className="text-end text-danger">{rs(r.liabilities)}</td></tr>
                <tr className="font-bold border-t border-borderStrong"><td className="py-1.5">Net zakatable</td><td className="text-end">{rs(r.net)}</td></tr>
                <tr><td className="py-1.5">Nisab ({r.nisabBasis})</td><td className="text-end">{rs(r.nisab)}</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-inkMuted mt-2">Assumptions: nisab basis = {r.nisabBasis}; gold value = weight × 24K rate × karat/24; rates from {prices.source} ({prices.timestamp}).</p>
            <Button variant="ghost" className="mt-3 w-full no-print" onClick={() => window.print()}>Print breakdown</Button>
          </Card>
          <Card>
            <Field label="Meri zakat ki tareekh (har saal yaad dilayein)"><Input type="date" value={zakatDate} onChange={(e) => setZakatDate(e.target.value)} /></Field>
            {zakatDate && <p className="text-sm text-inkMuted mt-2">Reminder Bills page par calendar (.ics) ke zariye bhi add kar sakte hain.</p>}
          </Card>
          <Notice tone="warning">Ulama ki raaye kuch masail (nisab ka base, zevar, investments) par mukhtalif hai. Yeh calculator scholar se review hona baqi hai. Apne aalim se zaroor poochein.</Notice>
        </div>
      </div>
    </div>
  );
}
