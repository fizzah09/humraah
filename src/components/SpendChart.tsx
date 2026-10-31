'use client';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colors } from '@/theme/colors';
import { rs } from '@/lib/format';

/** Loaded on demand so phones don't download the chart library until a statement is shown. */
export default function SpendChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={150} tick={{ fill: colors.inkSecondary, fontSize: 13 }} />
        <Tooltip formatter={(v: number) => rs(v)} cursor={{ fill: colors.surfaceAlt }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((c, i) => <Cell key={c.name} fill={i === 0 ? colors.primary : i === 1 ? colors.primaryLight : colors.borderStrong} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
