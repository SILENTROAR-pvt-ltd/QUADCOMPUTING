'use client';

import React from 'react';
import { inr, istDateTime } from '@/components/stay/stay-format';
import { ORDER_TONE, orderStatus } from './order-status';
import type { RoomState } from './useRoomStay';

type Order = NonNullable<RoomState['folio']>['orders'][number];

/** The food and drinks sent to the room this stay, newest first, each with where the kitchen has it. */
export function RoomOrdersList({ orders, limit }: { orders: Order[]; limit?: number }) {
  const shown = limit ? orders.slice(0, limit) : orders;
  return (
    <ul className="divide-y divide-neutral-100">
      {shown.map((o) => {
        const s = orderStatus(o.status, o.kot_status);
        return (
          <li key={o.id} className="flex items-start justify-between gap-3 py-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-neutral-950">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ') || 'Order'}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ORDER_TONE[s.tone]}`}>
                  {s.tone === 'busy' && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}{s.label}
                </span>
                {istDateTime(o.created_at)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-neutral-800">{inr(o.grand_total)}</span>
          </li>
        );
      })}
    </ul>
  );
}
