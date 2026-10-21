'use client';

import React from 'react';
import { BedDouble } from 'lucide-react';
import type { StayReport } from '@/lib/services/analytics/reports.util';

/**
 * The rooms' side of the period, from the settled stay bills: advances taken, invoices at checkout, nights sold and what
 * a night brought in, with the add-ons, check-out fees and room service the stays carried.
 */
export function StaysCard({ s, format }: { s: StayReport; format: (n: number) => string }) {
  const total = s.rooms_net + s.addons_net + s.extras_net;
  const rows: Array<[string, string, string?]> = [
    ['Rooms (nights)', format(s.rooms_net), `${s.nights} night${s.nights === 1 ? '' : 's'} · ${format(s.avg_night_rate)} a night`],
    ['Room add-ons', format(s.addons_net)],
    ['Early check-in & late check-out', format(s.extras_net)],
    ['Room service on stay invoices', format(s.room_service_net), 'counted under food & drinks'],
  ];
  return (
    <section aria-label="Rooms and stays" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-neutral-950">Rooms &amp; stays</h3>
          <p className="text-[11px] text-neutral-500">Settled stay bills: advances before check-in and invoices at checkout</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><BedDouble className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums text-neutral-950">{format(total)}</p>
      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-neutral-700">{s.checkouts} check-out{s.checkouts === 1 ? '' : 's'}</span>
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-neutral-700">{s.stay_bills} stay bill{s.stay_bills === 1 ? '' : 's'}</span>
        {s.checkouts > 0 && <span className="rounded-md bg-neutral-100 px-2 py-1 text-neutral-700">Avg stay {format(s.avg_stay_value)}</span>}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(([label, value, hint]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 text-neutral-700">
            <dt className="min-w-0">{label}{hint && <span className="ml-1.5 text-[11px] text-neutral-400">{hint}</span>}</dt>
            <dd className="shrink-0 tabular-nums font-medium text-neutral-950">{value}</dd>
          </div>
        ))}
      </dl>
      {total === 0 && <p className="mt-3 text-xs text-neutral-400">No stay bills settled in this period.</p>}
    </section>
  );
}
