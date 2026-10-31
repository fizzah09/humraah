'use client';
import { useState } from 'react';
import { Badge, Button, Input, Notice } from './ui';
import { checkContact, type ContactVerdict } from '@/lib/banks/directory';
import { logActivity } from '@/lib/activity';

const TONE = { official: 'success', lookalike: 'danger', personal_mobile: 'danger', unknown: 'warning' } as const;
const TITLE = { official: 'Bank ka official', lookalike: 'Naqli (bank ki naqal)', personal_mobile: 'Bank ka nahi', unknown: 'Hamari list mein nahi' };

/** "Asli ya naqli?" for a phone number, SMS short code, email address or website. */
export default function ContactCheck() {
  const [q, setQ] = useState('');
  const [r, setR] = useState<ContactVerdict | null>(null);
  const run = () => {
    if (!q.trim()) return;
    const v = checkContact(q);
    setR(v);
    logActivity('Asli ya naqli', 'action', `"${q.trim().slice(0, 80)}" check kiya: ${TITLE[v.status]}${v.bank ? ` (${v.bank.name})` : ''}.`);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="Number, email ya website: 111-111-425 / x@hbl.com / ubl-help.xyz" aria-label="Number, email ya website" />
        <Button onClick={run}>Check</Button>
      </div>
      {r && (
        <Notice tone={TONE[r.status]}>
          <p className="flex items-center gap-2 flex-wrap"><b className="text-lg">{TITLE[r.status]}</b>{r.bank && <Badge tone="neutral">{r.bank.name}</Badge>}<Badge tone="neutral">{r.kind}</Badge></p>
          <p className="mt-1">{r.explain}</p>
          {r.bank && <p className="text-sm mt-1">Source: <a className="underline" href={r.bank.source} target="_blank" rel="noopener noreferrer">{r.bank.source}</a> · checked {r.bank.verifiedOn}</p>}
          <p className="text-sm mt-2">Yaad rakhein: call aur email ka number/naam naqli bhi dikhaya ja sakta hai. Shak ho to <b>phone band karein</b> aur card ke peechay likhe number par <b>khud</b> call karein.</p>
        </Notice>
      )}
    </div>
  );
}
