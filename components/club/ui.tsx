'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { CLUB_DISPLAY } from './fonts';

// Club UI kit, soft luxury: ivory page, white cards, forest-green ink and actions, chartreuse highlights.
export const INK = 'text-[#14261b]';
export const MUTED = 'text-[#14261b]/65';
export const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17301f]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1efe6]';
export const field =
  'w-full rounded-2xl border border-[#14261b]/10 bg-[#f2f0e8] px-4 py-3 text-sm text-[#14261b] [color-scheme:light] placeholder:text-[#14261b]/40 focus:border-[#17301f]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#c8da4a]/30 disabled:opacity-60';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'ink' | 'aura' | 'quiet' | 'danger'; busy?: boolean };

export function Button({ tone = 'ink', busy, className = '', children, disabled, ...rest }: ButtonProps) {
  const tones = {
    ink: 'bg-[#17301f] text-[#f6f4ec] hover:bg-[#22432c]',
    aura: 'bg-[#c8da4a] text-[#14261b] shadow-[0_14px_30px_-14px_rgba(120,140,20,0.7)] hover:bg-[#bccf3b]',
    quiet: 'border border-[#14261b]/15 bg-white text-[#14261b] hover:bg-[#f2f0e8]',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button {...rest} disabled={disabled || busy}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${tones[tone]} ${className}`}>
      {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-[28px] border border-[#14261b]/[0.06] bg-[#fbfaf6] p-5 shadow-[0_18px_40px_-30px_rgba(20,38,27,0.45)] sm:p-6 ${className}`}>{children}</div>;
}

export function Label({ text, hint, children }: { text: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#14261b]/80">{text}{hint && <span className="ml-1 font-normal text-[#14261b]/55">· {hint}</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

/** A section heading. Member pages already have their title bar as the h1, so this is an h2 there. */
export function Heading({ kicker, title, children, level = 2 }: { kicker?: string; title: React.ReactNode; children?: React.ReactNode; level?: 1 | 2 }) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <header className="mb-6">
      {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3c6b2b]">{kicker}</p>}
      <H className={`${CLUB_DISPLAY} mt-1.5 text-[32px] font-semibold leading-[1.1] tracking-tight text-[#14261b] sm:text-[42px]`}>{title}</H>
      {children && <div className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{children}</div>}
    </header>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'aura'; children: React.ReactNode }) {
  const tones = {
    neutral: 'bg-[#14261b]/[0.06] text-[#14261b]/80', good: 'bg-[#e1efe3] text-[#2f5d1f]', warn: 'bg-amber-100 text-amber-800',
    bad: 'bg-red-100 text-red-700', aura: 'bg-[#c8da4a] text-[#14261b]',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone = 'bad', children }: { tone?: 'bad' | 'good' | 'info'; children: React.ReactNode }) {
  if (!children) return null;
  const tones = { bad: 'border-red-200 bg-red-50 text-red-800', good: 'border-[#3c6b2b]/20 bg-[#e1efe3] text-[#2f5d1f]', info: 'border-[#14261b]/10 bg-white text-[#14261b]/80' };
  return <p role={tone === 'bad' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</p>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-16 text-sm ${MUTED}`}>
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-[#3c6b2b]" /> {label}…
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#14261b]/15 bg-white/50 px-6 py-10 text-center">
      <p className={`${CLUB_DISPLAY} text-xl font-semibold text-[#14261b]`}>{title}</p>
      {children && <div className={`mx-auto mt-2 max-w-sm text-sm ${MUTED}`}>{children}</div>}
    </div>
  );
}

export function Avatar({ url, name, size = 40, ring = false }: { url: string | null | undefined; name: string; size?: number; ring?: boolean }) {
  const initials = name.replace(/^@/, '').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const ringed = ring ? 'ring-2 ring-[#c8da4a] ring-offset-2 ring-offset-[#f1efe6]' : '';
  return url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt="" width={size} height={size} className={`shrink-0 rounded-full bg-[#e1efe3] object-cover ${ringed}`} style={{ width: size, height: size }} />
    : <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#dfe9c4] to-[#9fbf7a] font-semibold text-[#17301f] ${ringed}`} style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}>{initials || '✦'}</span>;
}
