'use client';

import React from 'react';
import { GUEST_BRAND } from '@/lib/brand';
import { LUXE_FONT_VAR, LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

interface Props {
  eyebrow?: string;
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

/** The shell every stay page shares, in the guest menu's luxury theme: ivory paper, forest and gold, the house serif. */
export function StayShell({ eyebrow, title, right, children }: Props) {
  return (
    <main className={`${LUXE_FONT_VAR} min-h-[100dvh] bg-[#f5f1e8] text-[#10231a] selection:bg-[#d9c193] selection:text-[#10231a]`}>
      {/* A soft champagne light behind the top of the page, the same as the menu's banner glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(217,193,147,0.28),transparent_70%)]" />
      <header className="sticky top-0 z-40 border-b border-[#e8dfcc] bg-[#f5f1e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[9.5px] font-semibold uppercase tracking-[0.3em] text-[#8a6d3f]">{eyebrow || GUEST_BRAND.name}</p>
            {title && <h1 className="truncate text-[1.4rem] font-medium leading-tight text-[#10231a] sm:text-[1.6rem]" style={LUXE_SERIF}>{title}</h1>}
          </div>
          {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
        </div>
      </header>
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 pt-5 sm:px-6 sm:pt-7">{children}</div>
      <footer className="border-t border-[#e8dfcc] px-4 py-6 text-center text-[11px] text-[#10231a]/45">
        Powered by {GUEST_BRAND.name} · Pay at the property, nothing is charged online.
      </footer>
    </main>
  );
}

export function StayNotice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'good'; children: React.ReactNode }) {
  const cls = tone === 'warn' ? 'border-[#d9c193] bg-[#fbf6e8] text-[#6f5631]' : tone === 'good' ? 'border-[#0f2a1e]/20 bg-[#eef3ee] text-[#173a2a]' : 'border-[#e8dfcc] bg-[#fbf9f4] text-[#10231a]/75';
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

export function StaySpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0f2a1e] border-t-transparent" />
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a6d3f]">{label}</p>
    </div>
  );
}

/** Placeholder cards that hold the page's shape while data loads, so the page appears at once instead of behind a spinner. */
export function StaySkeleton({ rows = 3, tall = true }: { rows?: number; tall?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`shimmer rounded-[1.75rem] border border-[#e8dfcc] ${i === 0 && tall ? 'h-72' : 'h-36'}`} />
      ))}
    </div>
  );
}

// One button language for every stay screen, matched to the menu's pill CTAs. Sizes are separate variants rather than
// overrides, because two Tailwind heights on one element resolve by stylesheet order, not by which was written last.
const base = 'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';
const dark = 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_12px_28px_-14px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/30 hover:to-[#24573e]';
const light = 'border border-[#d9c193] bg-[#fbf9f4] text-[#10231a] hover:border-[#b08d57] hover:bg-white';
// The guest's live stay: forest with a gold ring, the same as the menu's "Your room" tile.
const live = 'bg-[#0f2a1e] text-[#f5f1e8] shadow-[0_12px_28px_-14px_rgba(15,42,30,0.85)] ring-2 ring-[#d9c193] hover:bg-[#173a2a]';

export const stayButton = {
  primary: `${base} ${dark} h-12 px-6 text-sm`,
  primarySm: `${base} ${dark} h-10 px-4 text-xs`,
  live: `${base} ${live} h-12 px-6 text-sm`,
  liveSm: `${base} ${live} h-10 px-4 text-xs`,
  ghost: `${base} ${light} h-12 px-6 text-sm`,
  ghostSm: `${base} ${light} h-10 px-4 text-xs`,
  input: 'h-12 w-full rounded-2xl border border-[#e8dfcc] bg-[#fbf9f4] px-4 text-sm text-[#10231a] placeholder-[#10231a]/40 outline-none transition focus:border-[#b08d57] focus:ring-4 focus:ring-[#d9c193]/20',
};
