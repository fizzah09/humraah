'use client';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Notice, PageHeader } from '@/components/ui';
import { load, onChange, save } from '@/lib/storage';
import type { Activity, ActivityKind } from '@/lib/activity';

const KIND: Record<ActivityKind, { label: string; icon: string }> = {
  said: { label: 'Aap ne kaha', icon: '🗣' },
  reply: { label: 'Saathi ne kaha', icon: '💬' },
  image: { label: 'Tasveer', icon: '🖼' },
  shared: { label: 'Aap ne batayi maloomat', icon: '📝' },
  action: { label: 'Kaam', icon: '✓' },
  security: { label: 'Hifazat', icon: '🔒' },
};

const fmt = (iso: string) => new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function HistoryPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityKind | 'all'>('all');
  useEffect(() => {
    const read = () => setItems(load<Activity[]>('activity', []));
    read();
    return onChange(read);
  }, []);
  const shown = useMemo(() => items.filter((a) => filter === 'all' || a.kind === filter), [items, filter]);
  const shared = items.filter((a) => a.kind === 'shared' || a.kind === 'image');
  const toAI = items.filter((a) => a.image?.sentToAI).length;

  const download = () => {
    const lines = items.map((a) => `${fmt(a.at)} | ${a.feature} | ${KIND[a.kind].label} | ${a.text}${a.image ? ` | tasveer ${a.image.width}x${a.image.height}, ${a.image.kb}KB, AI ko: ${a.image.sentToAI ? 'haan' : 'nahi'}, delete: ${a.image.deletedAt ? fmt(a.image.deletedAt) : 'abhi screen par'}` : ''}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob);
    el.download = 'humraah-history.txt';
    el.click();
    URL.revokeObjectURL(el.href);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Meri history" urdu="کیا کہا، کیا بتایا: سب کچھ یہاں" subtitle="Aap ne kya kaha, Saathi ne kya jawab diya, aur aap ne kaunsi maloomat ya tasveer di. Sirf is phone par, taale mein." />
      <div className="grid sm:grid-cols-3 gap-3">
        <Card><p className="text-sm text-inkMuted">Kul baatein</p><p className="text-3xl font-bold">{items.length}</p></Card>
        <Card><p className="text-sm text-inkMuted">Di gayi maloomat / tasveerein</p><p className="text-3xl font-bold">{shared.length}</p></Card>
        <Card><p className="text-sm text-inkMuted">Tasveerein jo AI ko gayin</p><p className="text-3xl font-bold">{toAI}</p></Card>
      </div>
      <Notice>🖼 Tasveerein <b>save nahi hotin</b>. Yahan sirf un ki tafseel hai: kab di, kitni bari, kya blur kiya, AI ko gayi ya nahi, aur kab delete hui.</Notice>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'said', 'reply', 'shared', 'image', 'action', 'security'] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-4 min-h-[44px] rounded-full border ${filter === k ? 'bg-primary text-white border-primary' : 'border-border text-inkSecondary hover:bg-surfaceAlt'}`}>
            {k === 'all' ? 'Sab' : `${KIND[k].icon} ${KIND[k].label}`}
          </button>
        ))}
      </div>
      <ol className="space-y-2">
        {shown.map((a) => (
          <li key={a.id} className="rounded-xl border border-border p-4 bg-white">
            <div className="flex items-center gap-2 flex-wrap text-sm text-inkMuted">
              <span aria-hidden className="text-lg">{KIND[a.kind].icon}</span>
              <span>{fmt(a.at)}</span><Badge tone="neutral">{a.feature}</Badge><span>{KIND[a.kind].label}</span>
            </div>
            <p className="mt-1 text-ink">{a.text}</p>
            {a.image && (
              <p className="mt-1 text-[16px] text-inkSecondary">
                {a.image.width}×{a.image.height}px · {a.image.kb} KB · blur: {a.image.blurBoxes} · OCR (phone par): {a.image.ocrRan ? 'haan' : 'nahi'} · AI ko bheji: <b>{a.image.sentToAI ? 'haan' : 'nahi'}</b> ·{' '}
                {a.image.deletedAt ? <span className="text-success font-semibold">delete ho gayi {fmt(a.image.deletedAt)}</span> : <span className="text-warning font-semibold">abhi screen par (2 min mein delete)</span>}
              </p>
            )}
          </li>
        ))}
        {!shown.length && <p className="text-inkMuted">Abhi kuch nahi.</p>}
      </ol>
      <div className="flex gap-2 flex-wrap">
        <Button variant="ghost" onClick={download}>History download karein</Button>
        <Button variant="danger" onClick={() => { if (confirm('Sari history delete karein?')) save('activity', []); }}>History delete karein</Button>
      </div>
    </div>
  );
}
