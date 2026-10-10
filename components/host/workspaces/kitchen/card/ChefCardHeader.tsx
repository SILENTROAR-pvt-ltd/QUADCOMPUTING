'use client';

import React from 'react';
import { Flame, CheckCircle2, Check, AlertCircle } from 'lucide-react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { formatTicketNumber } from './utils';

export function ChefCardHeader({ ticketNumber, status }: { ticketNumber: string; status: KitchenTicket['status'] }) {
  const { displayNum, isAddon } = formatTicketNumber(ticketNumber);

  return (
    <div className="h-11 px-3.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 gap-2 shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-mono text-sm font-bold tracking-tight text-neutral-900 truncate">
          {displayNum}
        </span>
        {isAddon && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-900 text-white shrink-0">
            Add-On
          </span>
        )}
      </div>

      <div className="shrink-0">
        {status === 'PREPARING' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-800 border border-amber-500/20">
            <Flame className="h-3 w-3 text-amber-600 animate-pulse shrink-0" />
            <span>Cooking</span>
          </span>
        )}
        {status === 'READY' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
            <span>Ready</span>
          </span>
        )}
        {status === 'PENDING' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse shrink-0" />
            <span>Pending</span>
          </span>
        )}
        {status === 'SERVED' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">
            <Check className="h-3 w-3 text-neutral-500 shrink-0" />
            <span>Delivered</span>
          </span>
        )}
        {status === 'CANCELLED' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
            <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
            <span>Cancelled</span>
          </span>
        )}
      </div>
    </div>
  );
}
