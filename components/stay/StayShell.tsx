'use client';

import React from 'react';
import { GUEST_BRAND } from '@/lib/brand';

interface Props {
  eyebrow?: string;
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** The light shell every stay page shares, the same cream page and black buttons as the table menu: a slim header, a wide column, and the guest brand in the footer. */
export function StayShell({ eyebrow, title, right, children }: Props) {
  return (
    <main className="min-h-[100dvh] bg-[#faf9f6] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* The same soft light the menu header has: warm gold over a hint of emerald, so the two pages read as one place. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(251,191,36,0.13),transparent_70%),radial-gradient(40%_40%_at_50%_30%,rgba(16,185,129,0.08),transparent_75%)]" />
      <header className="sticky top-0 z-40 border-b border-[#e6d9b8]/70 bg-[#faf9f6]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.26em] text-neutral-400">{eyebrow || GUEST_BRAND.name}</p>
            {title && <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-neutral-950 sm:text-xl" style={serif}>{title}</h1>}
          </div>
          {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
        </div>
      </header>
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 pt-5 sm:px-6 sm:pt-7">{children}</div>
      <footer className="border-t border-[#e6d9b8]/70 px-4 py-6 text-center text-[11px] text-neutral-400">
        Powered by {GUEST_BRAND.name} · Pay at the property, nothing is charged online.
      </footer>
    </main>
  );
}

export function StayNotice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'good'; children: React.ReactNode }) {
  const cls = tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-neutral-200 bg-white text-neutral-700';
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

export function StaySpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
    </div>
  );
}

/** Placeholder cards that hold the page's shape while data loads, so the page appears at once instead of behind a spinner. */
export function StaySkeleton({ rows = 3, tall = true }: { rows?: number; tall?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`shimmer rounded-[1.75rem] border border-[#e6d9b8]/70 ${i === 0 && tall ? 'h-72' : 'h-36'}`} />
      ))}
    </div>
  );
}

// One button language for every stay screen, matched to the menu's pill CTAs. Sizes are separate variants rather than
// overrides, because two Tailwind heights on one element resolve by stylesheet order, not by which was written last.
const base = 'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';
const dark = 'bg-neutral-950 text-white shadow-[0_12px_28px_-14px_rgba(0,0,0,0.65)] hover:bg-neutral-800';
const light = 'border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50';
// The guest's live stay: the same green as the menu's "Your room" tile.
const live = 'bg-emerald-700 text-white shadow-[0_12px_28px_-14px_rgba(4,120,87,0.8)] hover:bg-emerald-800';

export const stayButton = {
  primary: `${base} ${dark} h-12 px-6 text-sm`,
  primarySm: `${base} ${dark} h-10 px-4 text-xs`,
  live: `${base} ${live} h-12 px-6 text-sm`,
  liveSm: `${base} ${live} h-10 px-4 text-xs`,
  ghost: `${base} ${light} h-12 px-6 text-sm`,
  ghostSm: `${base} ${light} h-10 px-4 text-xs`,
  input: 'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5',
};
