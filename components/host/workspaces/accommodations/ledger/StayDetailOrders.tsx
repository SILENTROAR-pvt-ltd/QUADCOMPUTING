'use client';

import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import type { StayOrder } from '@/lib/services/accommodation/stay-detail.service';
import { inr, statusLabel, when } from './stay-format';

const TONE: Record<string, string> = { SETTLED: 'bg-emerald-50 text-emerald-800 ring-emerald-200', CANCELLED: 'bg-rose-50 text-rose-800 ring-rose-200' };

/** Food and drinks charged to the room during the stay, each with its dishes, time, status and who ordered it. */
export function StayDetailOrders({ orders }: { orders: StayOrder[] }) {
  const total = orders.reduce((s, o) => s + o.grand_total, 0);
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white" aria-label="Room-service orders">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950"><UtensilsCrossed className="h-4 w-4 text-neutral-500" aria-hidden />Food &amp; drinks to the room</p>
        <span className="font-mono text-sm font-semibold text-neutral-900">{orders.length ? inr(total) : '—'}</span>
      </div>
      {orders.length === 0 ? (
        <p className="px-4 py-5 text-center text-sm text-neutral-500">Nothing was ordered to the room during this stay.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {orders.map((o) => (
            <li key={o.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs text-neutral-600">
                  <span className="font-mono font-semibold text-neutral-900">#{o.id.slice(0, 8).toUpperCase()}</span> · {when(o.created_at)}{o.guest_handle ? ` · ${o.guest_handle}` : ''}
                </p>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${TONE[o.status.toUpperCase()] || 'bg-neutral-100 text-neutral-700 ring-neutral-200'}`}>{statusLabel(o.status)}</span>
                  <span className="font-mono text-sm font-semibold text-neutral-900">{inr(o.grand_total)}</span>
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-3 text-sm text-neutral-800">
                    <span className="min-w-0"><span className="font-mono text-neutral-500">{i.qty}×</span> {i.name}{i.notes ? <span className="block text-xs text-neutral-500">{i.notes}</span> : null}</span>
                    <span className="shrink-0 font-mono text-neutral-700">{inr(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
