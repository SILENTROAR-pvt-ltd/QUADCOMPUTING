'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import type { DishState } from '@/lib/utils/table-kitchen';
import { press } from '@/components/guest/menu/motion';
import { DISH, minutesSince } from './kitchen-ui';
import { DishRow } from './DishRow';

interface KitchenTicketBoxProps {
  ticket: KitchenTicket;
  now: number;
  serving: boolean;
  failed: boolean;
  onServe: (id: string) => void;
}

/** One ticket of a table: its number and age, every dish with where it is, and "Mark served" once the chef has finished it. */
export function KitchenTicketBox({ ticket, now, serving, failed, onServe }: KitchenTicketBoxProps) {
  const ready = ticket.status === 'READY';
  const served = ticket.status === 'SERVED';
  const mins = minutesSince(ready ? ticket.updated_at || ticket.created_at : ticket.created_at, now);
  const head: DishState = served ? 'served' : ready ? 'ready' : ticket.status === 'PREPARING' ? 'cooking' : 'waiting';
  return (
    <li className={`overflow-hidden rounded-xl border bg-white ${ready ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-neutral-200'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
        <p className="flex min-w-0 items-center gap-2 text-xs">
          <span className="font-mono font-bold text-neutral-950">{ticket.ticket_number}</span>
          {ticket.station && <span className="truncate text-neutral-500">{ticket.station}</span>}
        </p>
        <p className="flex shrink-0 items-center gap-1.5 text-[11px]">
          {mins !== null && !served && <span className="font-mono text-neutral-500">{ready ? `ready ${mins}m` : `${mins}m`}</span>}
          <span className={`rounded-full px-2 py-0.5 font-semibold ${DISH[head].chip}`}>{DISH[head].label}</span>
        </p>
      </div>
      <ul className="divide-y divide-neutral-100">
        {(ticket.items || []).map((item, idx) => <DishRow key={`${ticket.id}-${idx}`} ticket={ticket} item={item} />)}
      </ul>
      {ready && (
        <div className="border-t border-emerald-100 bg-emerald-50/60 p-2">
          <motion.button type="button" onClick={() => onServe(ticket.id)} disabled={serving} {...press}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 text-[13px] font-semibold text-white disabled:opacity-60">
            {serving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            {serving ? 'Marking served…' : 'Mark served'}
          </motion.button>
          {failed && <p role="alert" className="mt-1.5 text-center text-[11px] font-medium text-rose-700">Could not save that. Please try again.</p>}
        </div>
      )}
    </li>
  );
}
