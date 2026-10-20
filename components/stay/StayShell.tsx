'use client';

import React from 'react';
import { GUEST_BRAND } from '@/lib/brand';

interface Props {
  eyebrow?: string;
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

/** The dark shell every stay page shares: a slim header, a wide column, and the guest brand in the footer. */
export function StayShell({ eyebrow, title, right, children }: Props) {
  return (
    <main className="min-h-[100dvh] bg-neutral-950 text-neutral-100 selection:bg-amber-200 selection:text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-800/70 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500">{eyebrow || GUEST_BRAND.name}</p>
            {title && <h1 className="truncate font-serif text-lg font-light text-white sm:text-xl">{title}</h1>}
          </div>
          {right}
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6">{children}</div>
      <footer className="border-t border-neutral-900 px-4 py-6 text-center text-[11px] text-neutral-600">
        Powered by {GUEST_BRAND.name} · Pay at the property, nothing is charged online.
      </footer>
    </main>
  );
}

export function StayNotice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'good'; children: React.ReactNode }) {
  const cls = tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-neutral-800 bg-neutral-900/60 text-neutral-300';
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

export function StaySpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">{label}</p>
    </div>
  );
}

export const stayButton = {
  primary: 'inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50',
  ghost: 'inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900/60 px-5 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 disabled:opacity-50',
  input: 'h-12 w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-amber-200/60',
};
