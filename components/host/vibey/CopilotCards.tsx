'use client';

import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { rupees } from '@/lib/guest/cashback';
import type { HostCard } from '@/lib/vibey/host/schema';

type Fmt = 'money' | 'count' | 'pct' | 'text';

/** A tool's number as the dashboard shows it. A missing value reads as a dash, never as zero. */
export function show(value: number | string | null, format: Fmt): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (format === 'money') return rupees(value);
  if (format === 'pct') return `${value > 0 ? '+' : ''}${value}%`;
  return value.toLocaleString('en-IN');
}

function Link({ card, onNavigate }: { card: HostCard; onNavigate: (tab: string) => void }) {
  if (!card.link) return null;
  return (
    <button type="button" onClick={() => onNavigate(card.link!.tab)}
      className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-100">
      {card.link.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** One answer card: figures (KPI tiles), a list, or a note. Every number is the tool's own. */
export function CopilotCard({ card, onNavigate }: { card: HostCard; onNavigate: (tab: string) => void }) {
  if (card.kind === 'note') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-950">
        <p className="flex items-center gap-1.5 font-semibold">{card.title === 'Locked' && <Lock className="h-3.5 w-3.5" aria-hidden />}{card.title}</p>
        <p className="mt-0.5">{card.text}</p>
        <Link card={card} onNavigate={onNavigate} />
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{card.title}</p>
      <p className="mt-0.5 text-[11px] text-neutral-400">{card.scope}</p>
      {card.kind === 'kpis' ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
          {card.items.map((i) => (
            <div key={i.label}>
              <dt className="text-[11px] text-neutral-500">{i.label}</dt>
              <dd className="font-serif text-xl tabular-nums text-neutral-950">{show(i.value, i.format)}</dd>
            </div>
          ))}
        </dl>
      ) : card.rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-neutral-500">{card.empty || 'Nothing to show.'}</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100">
          {card.rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-neutral-900">{r.label}</span>
                {r.sub && <span className="block text-[11px] text-neutral-500">{r.sub}</span>}
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900">{show(r.value, r.format)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link card={card} onNavigate={onNavigate} />
    </div>
  );
}
