'use client';

import React from 'react';
import type { KitchenTicket, TicketTimingBreakdown } from '@/lib/utils/kitchen';

interface Props {
  timings: TicketTimingBreakdown;
  status: KitchenTicket['status'];
}

export function ChefCardTimeAudit({ timings, status }: Props) {
  const prepText = timings.formattedStarted
    ? `${timings.formattedStarted}${timings.prepDurationMin ? ` (${timings.prepDurationMin}m)` : ''}`
    : 'Awaiting';

  const deliveredText = timings.formattedDelivered || (status === 'READY' ? 'Pass Ready' : '—');

  return (
    <div className="px-3.5 py-2 border-t border-neutral-100 bg-neutral-50/60 text-neutral-600 space-y-1 font-mono shrink-0">
      <div className="flex items-center justify-between text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
        <span>Time Audit</span>
        {timings.totalDurationMin > 0 && (
          <span className="text-neutral-700">Total: {timings.totalDurationMin}m</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px] border-t border-neutral-200/50">
        <div className="min-w-0">
          <span className="text-neutral-400 block text-[9px] uppercase tracking-wider">Received</span>
          <span className="font-semibold text-neutral-900 truncate block">{timings.formattedReceived}</span>
        </div>
        <div className="min-w-0">
          <span className="text-neutral-400 block text-[9px] uppercase tracking-wider">Prep</span>
          <span className="font-semibold text-neutral-900 truncate block">{prepText}</span>
        </div>
        <div className="min-w-0 text-right">
          <span className="text-neutral-400 block text-[9px] uppercase tracking-wider">Delivered</span>
          <span className="font-semibold text-neutral-900 truncate block">{deliveredText}</span>
        </div>
      </div>
    </div>
  );
}
