import type { ButtonHTMLAttributes, ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border rounded-xl2 shadow-card p-5 ${className}`}>{children}</div>;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primaryDark disabled:bg-inkSubtle',
  secondary: 'bg-primaryTint text-primaryDark hover:bg-surfaceMuted border border-primaryTint',
  ghost: 'bg-transparent text-inkSecondary hover:bg-surfaceAlt border border-border',
  danger: 'bg-dangerBg text-danger hover:bg-danger hover:text-white',
};

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primaryLight/40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-inkSecondary font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-sm text-inkMuted mt-1">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full min-h-[48px] px-4 rounded-xl border border-borderStrong bg-white text-ink placeholder:text-inkSubtle focus:outline-none focus:border-primary focus:ring-4 focus:ring-primaryTint';

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${inputCls} ${p.className ?? ''}`} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`${inputCls} ${p.className ?? ''}`} />;
}
export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${inputCls} py-3 ${p.className ?? ''}`} />;
}

type Tone = 'success' | 'warning' | 'danger' | 'neutral';
const TONES: Record<Tone, string> = {
  success: 'bg-successBg text-success',
  warning: 'bg-warningBg text-warning',
  danger: 'bg-dangerBg text-danger',
  neutral: 'bg-surfaceMuted text-inkSecondary',
};
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function Notice({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-xl px-4 py-3 text-[16px] ${TONES[tone]}`}>{children}</div>;
}

export function PageHeader({ title, urdu, subtitle }: { title: string; urdu?: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      {urdu && <p className="font-urdu text-primary text-xl leading-[2.2]" dir="rtl">{urdu}</p>}
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="text-inkMuted mt-1">{subtitle}</p>}
    </header>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  return (
    <div className="bg-surfaceAlt rounded-xl p-4">
      <p className="text-sm text-inkMuted">{label}</p>
      <p className={`text-2xl font-bold ${tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
