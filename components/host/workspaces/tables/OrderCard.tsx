'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import type { DishState } from '@/lib/utils/table-kitchen';
import { DISH, minutesSince } from './kitchen-ui';
import { DishRow } from './DishRow';

interface OrderCardProps {
  ticket: KitchenTicket;
  now: number;
  serving: boolean;
  failed: boolean;
  onServe: (id: string) => void;
}

/** One order as a box: table and ticket on top, every dish with where it is, and "Served" once it is ready. */
function OrderCardBase({ ticket, now, serving, failed, onServe }: OrderCardProps) {
  const ready = ticket.status === 'READY';
  const head: DishState = ready ? 'ready' : ticket.status === 'PREPARING' ? 'cooking' : 'waiting';
  const mins = minutesSince(ready ? ticket.updated_at || ticket.created_at : ticket.created_at, now);
  return (
    <li className={`flex flex-col overflow-hidden rounded-2xl border bg-white ${ready ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-neutral-200'}`}>
      <div className="flex items-start justify-between gap-2 border-b border-neutral-100 px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-serif text-xl leading-none text-neutral-950">{ticket.table_or_room || 'Counter'}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-neutral-500">{ticket.ticket_number}{ticket.station ? ` · ${ticket.station}` : ''}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DISH[head].chip}`}>{DISH[head].label}</span>
          {mins !== null && <span className="font-mono text-[11px] text-neutral-500">{ready ? `ready ${mins}m` : `${mins}m`}</span>}
        </div>
      </div>

      <ul className="flex-1 divide-y divide-neutral-100">
        {(ticket.items || []).map((item, idx) => <DishRow key={`${ticket.id}-${idx}`} ticket={ticket} item={item} />)}
      </ul>

      <div className="border-t border-neutral-100 p-2">
        <motion.button type="button" onClick={() => onServe(ticket.id)} disabled={!ready || serving} {...press}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 text-[13px] font-semibold text-white disabled:cursor-default disabled:bg-neutral-100 disabled:text-neutral-400">
          {serving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
          {serving ? 'Marking served…' : ready ? 'Served' : 'Not ready yet'}
        </motion.button>
        {failed && <p role="alert" className="mt-1.5 text-center text-[11px] font-medium text-rose-700">Could not save that. Please try again.</p>}
      </div>
    </li>
  );
}

export const OrderCard = React.memo(OrderCardBase);
