'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Notice, PageHeader } from '@/components/ui';
import { T } from '@/components/LangProvider';
import ContactCheck from '@/components/ContactCheck';
import { useStored } from '@/lib/storage';
import { BANKS, bankById } from '@/lib/banks/directory';
import { TERMS } from '@/lib/banks/terms';
import { PLAYBOOKS } from '@/lib/assistant/playbooks';
import { logActivity } from '@/lib/activity';
import type { Profile } from '@/components/AuthGate';

export default function BanksPage() {
  const [profile, setProfile] = useStored<Profile | null>('profile', null);
  const [termQ, setTermQ] = useState('');
  const bank = bankById(profile?.bank);

  const choose = (id: string) => {
    if (!profile) return;
    setProfile({ ...profile, bank: id });
    logActivity('Profile', 'shared', `Aap ne bank badla: ${bankById(id)?.name}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mera bank" urdu="آپ کا بینک، اس کے اصلی نمبر اور ایپ کی رہنمائی" subtitle="Sirf bank ki apni website se liye gaye numbers. Jo hum confirm nahi kar sakay, woh saaf likha hai." />

      <Card>
        <p className="font-bold mb-3">Aap kaunsi bank app istemal karte hain?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BANKS.map((b) => (
            <button key={b.id} onClick={() => choose(b.id)} className={`rounded-2xl border p-4 text-start min-h-[76px] ${profile?.bank === b.id ? 'border-primary bg-primaryTint' : 'border-border hover:bg-surfaceAlt'}`}>
              <span className="block font-bold">{b.name}</span>
              <span className="block text-sm text-inkMuted">{b.app}</span>
            </button>
          ))}
        </div>
      </Card>

      {bank && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-2xl font-bold">{bank.name} <span className="font-urdu text-primary text-xl">{bank.urdu}</span></p>
            <Badge tone="success">Checked {bank.verifiedOn}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-surfaceAlt p-4">
              <p className="text-sm text-inkMuted">Official helpline</p>
              {bank.helplines.map((h) => <a key={h} href={`tel:${h.replace(/[^\d+]/g, '')}`} className="block text-2xl font-bold text-primaryDark">📞 {h}</a>)}
              {bank.callerIds.length > 0 && <p className="text-sm text-inkSecondary mt-1">Bank in numbers se call kar sakta hai: {bank.callerIds.join(', ')}</p>}
            </div>
            <div className="rounded-xl bg-surfaceAlt p-4 space-y-1">
              <p className="text-sm text-inkMuted">Asli website / email domain</p>
              {bank.domains.map((d) => <p key={d} className="font-semibold">{d}</p>)}
              {bank.emails.map((e) => <p key={e} className="text-[16px]">✉ {e}</p>)}
              {bank.smsShortCodes.length > 0 && <p className="text-[16px]">SMS short code: {bank.smsShortCodes.join(', ')}</p>}
              <p className="text-[16px]">App: <b>{bank.app}</b>{!bank.appVerified && <span className="text-sm text-warning"> (naam store par confirm nahi kiya)</span>}</p>
            </div>
          </div>
          <p className="text-sm text-inkMuted">Source: <a className="underline" href={bank.source} target="_blank" rel="noopener noreferrer">{bank.source}</a></p>
          {bank.unverified.length > 0 && <Notice tone="warning"><b>Confirm nahi ho saka:</b> {bank.unverified.join(' · ')}</Notice>}
          <p className="text-[16px] text-inkSecondary">Sab se mehfooz number hamesha woh hai jo <b>aap ke card ke peechay</b> likha hai.</p>
        </Card>
      )}

      <Card>
        <p className="font-urdu text-primary text-lg" dir="rtl">اصلی یا نقلی؟</p>
        <p className="font-bold text-xl mb-2">Number, email ya website check karein</p>
        <ContactCheck />
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="font-bold text-xl">{bank ? `${bank.app} mein kaam kaise karein` : 'Bank app mein kaam kaise karein'}</p>
          <p className="text-inkSecondary text-[16px]">Har bank app mein button ke naam thoray mukhtalif hotay hain, aur bank har qadam ki official guide publish nahi karte. Is liye neeche <b>aam naam</b> likhe hain. Saathi aap ka asal screenshot parh kar wohi naam batata hai jo aap ki screen par likha hai.</p>
        </div>
        {PLAYBOOKS.map((p) => (
          <details key={p.task} className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-bold text-lg">{p.title}</summary>
            <ol className="mt-3 space-y-3">
              {p.steps.map((s, i) => (
                <li key={s.screen} className="flex gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-primaryTint text-primaryDark grid place-items-center font-bold">{i + 1}</span>
                  <div>
                    <p><b>{s.screen}:</b> {s.roman.replace('{label}', s.targets[0])}{s.targets.length > 1 && <span className="text-inkMuted"> (ya {s.targets.slice(1, 3).map((t) => `"${t}"`).join(' / ')})</span>}</p>
                    <p className="text-[16px] text-inkSecondary">Kyun? {s.why}</p>
                    {s.moneyStep && <Badge tone="warning">Paise wala qadam: naam aur raqam check karein</Badge>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex gap-2 flex-wrap mt-3">
              <Link href="/assistant"><Button>Saathi ke saath karein</Button></Link>
              <Link href="/practice"><Button variant="ghost">Pehle mashq karein</Button></Link>
            </div>
          </details>
        ))}
      </Card>

      <Card>
        <p className="font-urdu text-primary text-lg" dir="rtl">بینک کے الفاظ آسان زبان میں</p>
        <p className="font-bold text-xl mb-3">Bank ke lafz samjhein</p>
        <input value={termQ} onChange={(e) => setTermQ(e.target.value)} placeholder="Dhoondein: OTP, IBFT, Raast…" aria-label="Lafz dhoondein" className="w-full min-h-[48px] px-4 rounded-xl border border-borderStrong mb-3 focus:outline-none focus:border-primary" />
        <dl className="grid sm:grid-cols-2 gap-3">
          {TERMS.filter((t) => !termQ || t.term.toLowerCase().includes(termQ.toLowerCase())).map((t) => (
            <div key={t.term} className="rounded-xl bg-surfaceAlt p-3">
              <dt className="font-bold">{t.term}</dt>
              <dd><T ur={t.ur} roman={t.roman} className="text-inkSecondary" /></dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-inkMuted mt-3">Yeh aam matlab hain. Har bank ki fees aur sharait (terms &amp; conditions) us bank ki website par &quot;Schedule of Charges&quot; mein hoti hain.</p>
      </Card>
    </div>
  );
}
