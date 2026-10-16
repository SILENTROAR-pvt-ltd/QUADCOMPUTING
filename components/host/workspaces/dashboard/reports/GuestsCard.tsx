'use client';

import React from 'react';
import type { GuestReport } from '@/lib/services/analytics/guests-report.util';

/** Who came in this period, from My Guests: known guests, walk-ins, new against returning, and the top spenders. */
export function GuestsCard({ g, format }: { g: GuestReport; format: (n: number) => string }) {
  const rate = g.returning_rate ?? 0;
  const tiles = [
    { k: 'Connected guests', v: g.known, hint: 'by Vibers sign-in, phone or name' },
    { k: 'Walk-ins', v: g.walk_ins, hint: 'bills with no name or phone' },
    { k: 'New', v: g.new_guests, hint: 'first visit in this period' },
    { k: 'Returning', v: g.returning, hint: 'came before, or twice or more' },
  ];

  return (
    <section aria-label="Guests" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-neutral-950">Guests</h3>
        <span className="text-[11px] text-neutral-500">{g.source === 'ledger' ? 'From My Guests' : 'From bills'}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-xl bg-neutral-50 px-3 py-2.5" title={t.hint}>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{t.k}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-950">{t.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <div className="flex justify-between text-xs"><span className="text-neutral-600">Returning-guest rate</span>
          <span className="font-semibold tabular-nums text-neutral-950">{g.returning_rate === null ? '—' : `${g.returning_rate}%`}</span></div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate} aria-label="Returning-guest rate">
          <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${rate}%` }} />
        </div>
      </div>

      {g.top.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Top guests</p>
          <ul className="space-y-1.5 text-xs">
            {g.top.map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-neutral-900">{t.name}</span>
                  <span className="block text-[11px] text-neutral-500">{t.visits} {t.visits === 1 ? 'visit' : 'visits'} here · {t.lifetime_visits} all time</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-neutral-950">{format(t.spend)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
