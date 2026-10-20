'use client';

import React from 'react';
import { inr, istDateTime, plural } from '@/components/stay/stay-format';
import { StayNotice } from '@/components/stay/StayShell';
import type { RoomState } from './useRoomStay';

/** The running bill: the room for the nights so far, add-ons, and every in-room order. Settled at checkout. */
export function RoomFolio({ folio, checkoutTime }: { folio: RoomState['folio']; checkoutTime: string | null }) {
  if (!folio) return <StayNotice>Your bill will appear here.</StayNotice>;
  const row = 'flex items-start justify-between gap-3 py-2.5 text-sm';
  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-neutral-800 bg-neutral-900/40 p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Stay · {plural(folio.nights, 'night')} so far</p>
        <ul className="mt-2 divide-y divide-neutral-800/80">
          {folio.lines.map((l) => (
            <li key={l.id} className={row}>
              <span><span className="block text-white">{l.name}</span>{l.notes && <span className="text-xs text-neutral-500">{l.notes}</span>}</span>
              <span className="font-mono text-neutral-200">{inr(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[1.5rem] border border-neutral-800 bg-neutral-900/40 p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">In-room dining · {inr(folio.dining_total)}</p>
        {folio.orders.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nothing ordered yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-800/80">
            {folio.orders.map((o) => (
              <li key={o.id} className={row}>
                <span>
                  <span className="block text-white">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ') || 'Order'}</span>
                  <span className="text-xs text-neutral-500">{istDateTime(o.created_at)} · {String(o.status).toLowerCase()}</span>
                </span>
                <span className="font-mono text-neutral-200">{inr(o.grand_total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-amber-200/30 bg-amber-200/10 p-5">
        <div className="flex items-end justify-between">
          <span className="text-sm text-amber-100/80">Payable at checkout{checkoutTime ? ` · by ${checkoutTime}` : ''}</span>
          <span className="font-serif text-3xl text-white">{inr(folio.total)}</span>
        </div>
        <p className="mt-2 text-xs text-amber-100/70">The desk will add the final night and any taxes due, and take cash, card or UPI.</p>
      </section>
    </div>
  );
}
