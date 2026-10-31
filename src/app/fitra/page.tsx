'use client';
import { useState } from 'react';
import { Badge, Button, Card, Field, Input, Notice, PageHeader } from '@/components/ui';
import { useStored } from '@/lib/storage';
import { logActivity } from '@/lib/activity';
import { rs } from '@/lib/format';
import { calculateFidya, calculateFitra, FITRA_OPTIONS, FITRA_SOURCE, FITRA_YEAR } from '@/lib/fitra/rates';

export default function FitraPage() {
  const [adults, setAdults] = useStored<number>('fitraAdults', 2);
  const [kids, setKids] = useStored<number>('fitraKids', 0);
  const [opt, setOpt] = useStored<string>('fitraOption', 'wheat');
  const [custom, setCustom] = useState('');
  const [fidyaDays, setFidyaDays] = useState('');

  const o = FITRA_OPTIONS.find((x) => x.id === opt) ?? FITRA_OPTIONS[0];
  const perPerson = parseFloat(custom) > 0 ? parseFloat(custom) : o.perPerson;
  const people = (adults || 0) + (kids || 0);
  const r = calculateFitra(people, perPerson);
  const f = fidyaDays ? calculateFidya(parseFloat(fidyaDays) || 0, o) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Fitra ka hisaab" urdu="صدقۂ فطر: گھر کے ہر فرد کی طرف سے" subtitle={`Rates: ${FITRA_YEAR}, ${FITRA_SOURCE.by}. Har saal naye rate aatay hain.`} />
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 space-y-4">
          <p className="font-bold">1. Ghar mein kitne log hain?</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Baray (adults)"><Input type="number" min={0} inputMode="numeric" value={adults || ''} onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))} /></Field>
            <Field label="Bachay" hint="Eid se pehle paida hone wale bhi"><Input type="number" min={0} inputMode="numeric" value={kids || ''} onChange={(e) => setKids(Math.max(0, parseInt(e.target.value) || 0))} /></Field>
          </div>
          <p className="font-bold pt-2">2. Kis cheez ke hisaab se dena hai?</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {FITRA_OPTIONS.map((x) => (
              <button key={x.id} onClick={() => { setOpt(x.id); setCustom(''); }} className={`rounded-xl border p-3 text-start min-h-[64px] ${opt === x.id && !custom ? 'border-primary bg-primaryTint' : 'border-border hover:bg-surfaceAlt'}`}>
                <span className="block font-semibold">{x.label} <span className="font-urdu text-primary">{x.ur}</span></span>
                <span className="text-inkMuted">{rs(x.perPerson)} fi fard</span>
              </button>
            ))}
          </div>
          <Field label="Ya apne ilaqay/masjid ka rate (optional)" hint="Kuch ulama mehngi cheez ke hisaab se dene ki targheeb dete hain jin ki istitaat ho."><Input type="number" min={0} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={`Default ${o.perPerson}`} /></Field>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl2 bg-primary text-white p-6">
            <p className="text-primaryTint">Kul fitra</p>
            <p className="text-4xl font-bold">{rs(r.total)}</p>
            <p className="mt-1 text-primaryTint">{r.working}</p>
          </div>
          <Card className="space-y-2">
            <p className="font-bold">Aasaan alfaaz mein</p>
            <ol className="list-decimal ps-5 space-y-1.5 text-inkSecondary">
              <li>Fitra ghar ke <b>har fard</b> ki taraf se diya jata hai: baray, bachay, naya paida hua bacha bhi. Ghar ka sarbarah sab ki taraf se deta hai.</li>
              <li>Aap ke ghar mein <b>{people}</b> log hain ({adults} baray + {kids} bachay).</li>
              <li>{custom ? 'Aap ka rate' : `${o.label} ka rate`} <b>{rs(perPerson)}</b> fi fard hai. Is liye {r.working}.</li>
              <li>Behtar hai <b>Eid ki namaz se pehle</b> de dein, taa ke ghareeb bhi Eid mana sakein. Ramazan mein pehle bhi de sakte hain.</li>
              <li>Fitra mustahiq (zaroorat mand) ko dein, jaise zakat.</li>
            </ol>
            <Button variant="secondary" onClick={() => logActivity('Fitra', 'shared', `Fitra ka hisaab: ${r.working} (${custom ? 'apna rate' : o.label}, ${FITRA_YEAR}).`)}>History mein save karein</Button>
          </Card>
        </div>
      </div>

      <Card className="space-y-3">
        <p className="font-bold text-lg">Fidya (chhootay rozon ka)</p>
        <p className="text-inkSecondary text-[16px]">Jo bimari ya burhapay ki wajah se roze bilkul na rakh sake, woh har roze ke badlay fidya deta hai. ({o.label} ke hisaab se: {rs(o.fidya30 / 30)} fi roza)</p>
        <Field label="Kitne roze?"><Input type="number" min={0} max={30} value={fidyaDays} onChange={(e) => setFidyaDays(e.target.value)} placeholder="Maslan 10" /></Field>
        {f && <Notice tone="success"><b>Fidya: {rs(f.total)}</b> · {f.working}</Notice>}
      </Card>

      <Card className="text-[16px] space-y-1">
        <p className="font-bold">Rate kahan se aaye?</p>
        <p>{FITRA_SOURCE.by}, elaan {FITRA_SOURCE.announced}. <Badge tone="warning">Press reports se</Badge></p>
        {FITRA_SOURCE.links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="block underline text-primary break-all">{l}</a>)}
        <p className="text-inkMuted">{FITRA_SOURCE.note}</p>
      </Card>
      <Notice tone="warning">Yeh sirf hisaab hai, fatwa nahi. Masail mein ulama ki raaye mukhtalif ho sakti hai; apne aalim se poochein.</Notice>
    </div>
  );
}
