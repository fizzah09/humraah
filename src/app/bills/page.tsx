'use client';
import { useEffect, useMemo, useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import { Badge, Button, Card, Field, Input, Notice, PageHeader, Select } from '@/components/ui';
import { useStored } from '@/lib/storage';
import { extractBill, reminderDates, toIcs, type BillDraft } from '@/lib/bills/extract';
import { daysBetween, rs, today, uid } from '@/lib/format';
import type { Bill, LedgerEntry } from '@/lib/types';
import { logActivity } from '@/lib/activity';

const TYPES = ['Electricity (Bijli)', 'Gas', 'Water (Paani)', 'Internet / Phone', 'Mobile', 'School fee', 'Other'];

export default function BillsPage() {
  const [bills, setBills] = useStored<Bill[]>('bills', []);
  const [, setLedger] = useStored<LedgerEntry[]>('ledger', []);
  const [draft, setDraft] = useState<BillDraft & { recurring: boolean }>({ billerType: TYPES[0], amount: null, dueDate: null, consumerMasked: null, recurring: true });
  const [extracted, setExtracted] = useState(false);
  const [follower, setFollower] = useState('');
  const [notifPerm, setNotifPerm] = useState<string>('default');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if ('Notification' in window) setNotifPerm(Notification.permission); }, []);

  // Browser notifications for bills in a reminder window (7 days / 2 days / today).
  useEffect(() => {
    if (notifPerm !== 'granted') return;
    const t = today();
    bills.filter((b) => b.status === 'due').forEach((b) => {
      if (reminderDates(b.dueDate).some((r) => r.date === t)) {
        try { new Notification('Bank Saathi: bill reminder', { body: `${b.billerType} ${rs(b.amount)} due ${b.dueDate}` }); } catch { /* unsupported */ }
      }
    });
  }, [bills, notifPerm]);

  const groups = useMemo(() => {
    const t = today();
    const due = bills.filter((b) => b.status === 'due').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return {
      overdue: due.filter((b) => b.dueDate < t),
      soon: due.filter((b) => b.dueDate >= t),
      paid: bills.filter((b) => b.status === 'paid').sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    };
  }, [bills]);

  const add = () => {
    if (!draft.amount || !draft.dueDate) return setToast('Raqam aur due date zaroori hain.');
    const b: Bill = { id: uid(), billerType: draft.billerType, amount: draft.amount, dueDate: draft.dueDate, status: 'due', recurring: draft.recurring, consumerMasked: draft.consumerMasked ?? undefined, followers: [] };
    setBills((bs) => [...bs, b]);
    setDraft({ billerType: TYPES[0], amount: null, dueDate: null, consumerMasked: null, recurring: true });
    setExtracted(false);
    const d = daysBetween(today(), b.dueDate);
    setToast(`✓ Bill add ho gaya. ${d < 0 ? `🔔 Yeh bill ${-d} din late hai: jaldi bharein!` : d === 0 ? '🔔 Yeh bill AAJ bharna hai!' : `🔔 Aap ko yeh bill ${d} din mein (${b.dueDate}) bharna hai.`} App har screen ke upar yaad dilayegi: 7 din, 2 din aur aakhri din.`);
    logActivity('Bill yaad', 'shared', `${extracted ? 'Bill ki photo se' : 'Khud likh kar'} bill add kiya: ${b.billerType}, ${rs(b.amount)}, aakhri tareekh ${b.dueDate}${b.consumerMasked ? `, consumer ${b.consumerMasked}` : ''}.`);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && d <= 7) {
      try { new Notification('Bank Saathi: bill yaad', { body: `${b.billerType} ${rs(b.amount)} · ${b.dueDate}` }); } catch { /* unsupported */ }
    }
  };

  const markPaid = (b: Bill) => {
    setBills((bs) => {
      const next = bs.map((x) => (x.id === b.id ? { ...x, status: 'paid' as const } : x));
      if (b.recurring) {
        const d = new Date(b.dueDate + 'T00:00:00');
        d.setMonth(d.getMonth() + 1);
        next.push({ ...b, id: uid(), status: 'due', dueDate: d.toISOString().slice(0, 10) });
      }
      return next;
    });
    logActivity('Bill yaad', 'action', `${b.billerType} ka bill ${rs(b.amount)} paid mark kiya.`);
    if (confirm('Kharcha diary mein bhi likh dein? (bill payment)')) {
      setLedger((l) => [{ id: uid(), amount: b.amount, date: today(), source: 'transfer', purpose: 'bills', note: b.billerType }, ...l]);
    }
  };

  const ics = (b: Bill) => {
    const blob = new Blob([toIcs(b)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bill-${b.billerType.split(' ')[0].toLowerCase()}-${b.dueDate}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const lastOf = (b: Bill) => bills.filter((x) => x.billerType === b.billerType && x.dueDate < b.dueDate).sort((a, c) => c.dueDate.localeCompare(a.dueDate))[0];

  const BillRow = ({ b }: { b: Bill }) => {
    const d = daysBetween(today(), b.dueDate);
    const prev = lastOf(b);
    const spike = prev && b.amount > prev.amount * 1.3;
    return (
      <li className="rounded-xl border border-border p-4 space-y-2">
        <div className="flex justify-between gap-2 flex-wrap">
          <div>
            <p className="font-bold">{b.billerType} {b.recurring && <span className="text-sm font-normal text-inkMuted">· har mahine</span>}</p>
            <p className="text-inkMuted text-[16px]">Due {b.dueDate}{b.consumerMasked ? ` · ${b.consumerMasked}` : ''}</p>
          </div>
          <div className="text-end">
            <p className="text-xl font-bold">{rs(b.amount)}</p>
            {b.status === 'paid' ? <Badge tone="success">Paid</Badge> : d < 0 ? <Badge tone="danger">{-d} din late</Badge> : d <= 2 ? <Badge tone="warning">{d === 0 ? 'Aaj' : `${d} din`}</Badge> : <Badge>{d} din baqi</Badge>}
          </div>
        </div>
        {spike && <Notice tone="warning">Pichlay bill ({rs(prev.amount)}) se kaafi zyada hai. Check karein.</Notice>}
        {b.status === 'due' && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              {reminderDates(b.dueDate).map((r) => (
                <span key={r.label} className={`px-2 py-1 rounded-lg ${r.date < today() ? 'bg-surfaceMuted text-inkMuted line-through' : 'bg-primaryTint text-primaryDark'}`}>🔔 {r.label}: {r.date}</span>
              ))}
            </div>
            {b.followers.length > 0 && <p className="text-sm text-inkMuted">Family follow: {b.followers.join(', ')}</p>}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => markPaid(b)} className="!min-h-[44px]">Paid ho gaya</Button>
              <Button variant="ghost" onClick={() => ics(b)} className="!min-h-[44px]">Calendar (.ics)</Button>
              <Button variant="ghost" className="!min-h-[44px]" onClick={() => {
                if (!follower.trim()) return setToast('Pehle neeche family member ka number/email likhein.');
                setBills((bs) => bs.map((x) => (x.id === b.id ? { ...x, followers: [...new Set([...x.followers, follower.trim()])] } : x)));
              }}>+ Family follow</Button>
              <Button variant="danger" className="!min-h-[44px]" onClick={() => setBills((bs) => bs.filter((x) => x.id !== b.id))}>Delete</Button>
            </div>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bill yaad" urdu="بل کی تاریخ کبھی نہ بھولیں" subtitle="Bill ki photo khainchein ya khud likhein. 7 din, 2 din aur due date par yaad dehani." />
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 space-y-4">
          <p className="font-bold text-lg">Naya bill</p>
          <ImageUpload feature="Bill yaad" withOcr compact onImage={(img) => {
            if (!img.ocr?.text) { setToast('Photo se parh nahi saka. Neeche khud likhein.'); return; }
            const d = extractBill(img.ocr.text);
            setDraft((x) => ({ ...x, ...d, billerType: TYPES.includes(d.billerType) ? d.billerType : 'Other' }));
            setExtracted(true);
          }} />
          {extracted && <Notice tone="warning">Photo se yeh values mili hain. <b>Bill se mila kar confirm karein.</b> Photo delete kar di gayi.</Notice>}
          <Field label="Bill ki qisam"><Select value={draft.billerType} onChange={(e) => setDraft({ ...draft, billerType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Raqam (Rs.)"><Input type="number" min={1} value={draft.amount ?? ''} onChange={(e) => setDraft({ ...draft, amount: +e.target.value || null })} /></Field>
            <Field label="Due date"><Input type="date" value={draft.dueDate ?? ''} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })} /></Field>
          </div>
          {draft.consumerMasked && <p className="text-[16px] text-inkMuted">Consumer no: {draft.consumerMasked} (masked)</p>}
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-primary" checked={draft.recurring} onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })} />Har mahine aata hai</label>
          <Button className="w-full" onClick={add}>{extracted ? 'Confirm & add' : 'Add bill'}</Button>
          {toast && <Notice tone="success">{toast}</Notice>}
          <div className="border-t border-border pt-4 space-y-2">
            <p className="font-bold">Reminder channels</p>
            <div className="flex items-center justify-between gap-2">
              <span>Browser notifications</span>
              {notifPerm === 'granted' ? <Badge tone="success">On</Badge> : <Button variant="secondary" className="!min-h-[40px]" onClick={async () => setNotifPerm(await Notification.requestPermission())}>Turn on</Button>}
            </div>
            <div className="flex items-center justify-between gap-2"><span>Calendar (.ics)</span><Badge tone="success">Har bill par</Badge></div>
            <div className="flex items-center justify-between gap-2"><span>WhatsApp / Email</span><Badge tone="warning">Server setup (README)</Badge></div>
            <Field label="Family member (WhatsApp no. / email)"><Input value={follower} onChange={(e) => setFollower(e.target.value)} placeholder="03xx-xxxxxxx" /></Field>
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-5">
          {groups.overdue.length > 0 && <section><h2 className="font-bold text-danger mb-2">Overdue ({groups.overdue.length})</h2><ul className="space-y-3">{groups.overdue.map((b) => <BillRow key={b.id} b={b} />)}</ul></section>}
          <section><h2 className="font-bold mb-2">Due soon ({groups.soon.length})</h2><ul className="space-y-3">{groups.soon.map((b) => <BillRow key={b.id} b={b} />)}</ul>{!groups.soon.length && <p className="text-inkMuted">Koi bill baqi nahi.</p>}</section>
          {groups.paid.length > 0 && <section><h2 className="font-bold text-success mb-2">Paid ({groups.paid.length})</h2><ul className="space-y-3">{groups.paid.slice(0, 6).map((b) => <BillRow key={b.id} b={b} />)}</ul></section>}
        </div>
      </div>
    </div>
  );
}
