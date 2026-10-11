'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { AURA } from '@/components/club/theme';
import { DISPLAY } from '@/components/vibers/vibers-fonts';

// Club UI kit: the Vibers Connect look (ivory, ink, one aura gradient), clean and quiet.
export const INK = 'text-[#2a1250]';
export const MUTED = 'text-[#2a1250]/60';
export const field =
  'w-full rounded-xl border border-[#2a1250]/15 bg-white px-3.5 py-2.5 text-sm text-[#2a1250] placeholder:text-[#2a1250]/35 focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 disabled:opacity-60';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'ink' | 'aura' | 'quiet' | 'danger'; busy?: boolean };

export function Button({ tone = 'ink', busy, className = '', children, disabled, ...rest }: ButtonProps) {
  const tones = {
    ink: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]',
    aura: `${AURA} text-white shadow-[0_10px_30px_-12px_rgba(255,46,136,0.8)] hover:brightness-105`,
    quiet: 'border border-[#2a1250]/15 bg-white text-[#2a1250] hover:bg-[#2a1250]/[0.04]',
    danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  };
  return (
    <button {...rest} disabled={disabled || busy}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}>
      {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-3xl border border-[#2a1250]/10 bg-white/90 p-5 shadow-[0_12px_40px_-24px_rgba(124,58,237,0.35)] sm:p-6 ${className}`}>{children}</div>;
}

export function Label({ text, hint, children }: { text: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#2a1250]/80">{text}{hint && <span className="ml-1 font-normal text-[#2a1250]/45">· {hint}</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function Heading({ kicker, title, children }: { kicker?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#be185d]">{kicker}</p>}
      <h1 className={`${DISPLAY} mt-1 text-3xl leading-tight ${INK} sm:text-4xl`}>{title}</h1>
      {children && <div className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{children}</div>}
    </header>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'aura'; children: React.ReactNode }) {
  const tones = {
    neutral: 'bg-[#f3ebff] text-[#5b21b6]', good: 'bg-emerald-50 text-emerald-800', warn: 'bg-amber-50 text-amber-800',
    bad: 'bg-rose-50 text-rose-700', aura: `${AURA} text-white`,
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone = 'bad', children }: { tone?: 'bad' | 'good' | 'info'; children: React.ReactNode }) {
  if (!children) return null;
  const tones = { bad: 'border-rose-200 bg-rose-50 text-rose-800', good: 'border-emerald-200 bg-emerald-50 text-emerald-900', info: 'border-[#2a1250]/10 bg-[#f3ebff]/60 text-[#2a1250]/80' };
  return <p role={tone === 'bad' ? 'alert' : 'status'} className={`rounded-2xl border px-3.5 py-2.5 text-sm ${tones[tone]}`}>{children}</p>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-16 text-sm ${MUTED}`}>
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> {label}…
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#2a1250]/15 px-6 py-10 text-center">
      <p className={`${DISPLAY} text-xl ${INK}`}>{title}</p>
      {children && <div className={`mx-auto mt-2 max-w-sm text-sm ${MUTED}`}>{children}</div>}
    </div>
  );
}

export function Avatar({ url, name, size = 40 }: { url: string | null | undefined; name: string; size?: number }) {
  const initials = name.replace(/^@/, '').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full ${AURA} text-xs font-bold text-white`} style={{ width: size, height: size }}>{initials || '✦'}</span>;
}
