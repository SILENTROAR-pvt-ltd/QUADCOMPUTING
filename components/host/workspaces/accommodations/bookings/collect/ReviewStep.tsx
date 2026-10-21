'use client';

import React from 'react';
import type { StayPolicies } from '@/lib/services/stay/stay-policy';
import type { Quote } from './useCollect';

const money = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

interface Props {
  quote: Quote | null; error: string | null; policies: StayPolicies | null; earlyId: string | null | undefined; canPickEarly: boolean;
  onEarly: (id: string | null) => void; onRetry: () => void; onNext: () => void;
}

/** What the guest owes for the room, as the server works it out, with the early check-in option if the owner offers one. */
export function ReviewStep({ quote, error, policies, earlyId, canPickEarly, onEarly, onRetry, onNext }: Props) {
  const options = canPickEarly ? policies?.early_checkin || [] : [];
  return (
    <div className="space-y-4">
      {options.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">Arrival</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ id: null, label: 'Standard check-in' }, ...options].map((o) => {
              const on = (earlyId ?? null) === o.id;
              return (
                <button key={o.id ?? 'standard'} type="button" aria-pressed={on} onClick={() => onEarly(o.id)}
                  className={`cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'}`}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error} <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2 cursor-pointer">Try again</button>
        </div>
      ) : !quote ? (
        <div className="h-40 animate-pulse rounded-2xl border border-neutral-200 bg-white" aria-busy="true" />
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{quote.title}</p>
          <p className="text-xs text-neutral-500">{quote.guestName} · {quote.subtitle}</p>
          <ul className="mt-3 divide-y divide-neutral-100 text-sm">
            {quote.lines.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 py-2">
                <span><span className="block text-neutral-900">{l.name}</span>{l.notes && <span className="text-xs text-neutral-500">{l.notes}</span>}</span>
                <span className="font-mono tabular-nums text-neutral-900">{money(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-neutral-900 pt-3">
            <span className="text-sm font-semibold text-neutral-950">To collect</span>
            <span className="font-serif text-2xl tabular-nums text-neutral-950">{money(quote.amount)}</span>
          </div>
        </div>
      )}
      <button type="button" disabled={!quote || Boolean(error)} onClick={onNext} className="h-12 w-full cursor-pointer rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
        {quote && quote.amount === 0 ? 'Continue' : 'Continue to payment'}
      </button>
    </div>
  );
}
