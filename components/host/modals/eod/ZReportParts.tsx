'use client';

import React from 'react';

export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const istTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

export const istLongDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

/** A numbered report section; it is kept on one printed page where it fits. */
export function ZSection({ n, title, aside, children }: { n: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-neutral-200 pb-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          <span className="mr-1.5 font-mono text-neutral-400">{String(n).padStart(2, '0')}</span>{title}
        </h3>
        {aside && <span className="text-[11px] text-neutral-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

interface ZRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: 'default' | 'strong' | 'total' | 'muted' | 'minus';
  indent?: boolean;
}

const TONES = {
  default: 'text-neutral-800',
  strong: 'font-semibold text-neutral-950',
  total: 'border-t border-neutral-900 pt-2 mt-1 text-base font-bold text-neutral-950',
  muted: 'text-xs text-neutral-500',
  minus: 'text-rose-700',
} as const;

/** A label and an amount, aligned like a ledger line. */
export function ZRow({ label, value, tone = 'default', indent = false }: ZRowProps) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1 text-sm ${TONES[tone]} ${indent ? 'pl-4' : ''}`}>
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

/** A headline figure at the top of the report. */
export function ZStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 print:border-neutral-300 print:bg-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 font-serif text-xl tabular-nums text-neutral-950">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-neutral-500">{hint}</p>}
    </div>
  );
}
