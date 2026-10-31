'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { load, onChange } from '@/lib/storage';
import { daysBetween, rs, today } from '@/lib/format';
import type { Bill } from '@/lib/types';

/** In-app reminder shown on every screen when a bill is due within 7 days or overdue. */
export default function ReminderBanner() {
  const path = usePathname();
  const [bills, setBills] = useState<Bill[]>([]);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const read = () => setBills(load<Bill[]>('bills', []));
    read();
    return onChange(read);
  }, []);
  if (hidden || path === '/bills') return null;
  const t = today();
  const due = bills
    .filter((b) => b.status === 'due' && daysBetween(t, b.dueDate) <= 7)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!due.length) return null;
  const b = due[0];
  const d = daysBetween(t, b.dueDate);
  const late = d < 0;
  return (
    <div role="alert" className={`border-b ${late ? 'bg-dangerBg border-danger/30 text-danger' : 'bg-warningBg border-warning/30 text-warning'}`}>
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-xl" aria-hidden>🔔</span>
        <p className="font-semibold flex-1 min-w-0">
          {late ? `${b.billerType} ka bill ${-d} din late hai` : d === 0 ? `${b.billerType} ka bill aaj bharna hai` : `${b.billerType} ka bill ${d} din mein bharna hai`} · {rs(b.amount)}
          {due.length > 1 && <span className="font-normal"> (+{due.length - 1} aur)</span>}
        </p>
        <Link href="/bills" className="underline font-bold">Dekhein</Link>
        <button onClick={() => setHidden(true)} aria-label="Band karein" className="h-9 w-9 rounded-lg hover:bg-white/50">✕</button>
      </div>
    </div>
  );
}
