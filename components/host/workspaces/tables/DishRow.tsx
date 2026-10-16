'use client';

import React from 'react';
import { CheckCircle2, ChefHat } from 'lucide-react';
import type { KitchenItem, KitchenTicket } from '@/lib/utils/kitchen';
import { dishState } from '@/lib/utils/table-kitchen';
import { DISH } from './kitchen-ui';

/** One dish of a ticket: quantity and name (with the guest's note) on the left, where it is on the right. */
export function DishRow({ ticket, item }: { ticket: Pick<KitchenTicket, 'status'>; item: KitchenItem }) {
  const state = dishState(ticket, item);
  return (
    <li className="flex items-start justify-between gap-2 px-3 py-2">
      <p className="min-w-0 text-[13.5px] font-medium leading-snug text-neutral-950">
        <span className="mr-1.5 font-mono font-bold">{Math.max(1, Number(item.qty) || 1)}×</span>
        <span className="break-words">{item.name}</span>
        {item.notes && <span className="mt-0.5 block text-[11px] font-normal text-amber-800">{item.notes}</span>}
      </p>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${DISH[state].chip}`}>
        {state === 'served' || state === 'ready' ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <ChefHat className="h-3 w-3" aria-hidden />}
        {state === 'ready' ? 'Ready' : DISH[state].label}
      </span>
    </li>
  );
}
