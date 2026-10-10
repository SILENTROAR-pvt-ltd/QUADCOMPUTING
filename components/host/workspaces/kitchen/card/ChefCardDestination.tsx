'use client';

import React from 'react';
import { UtensilsCrossed, Bed, Clock } from 'lucide-react';
import type { KitchenTicket, TicketTimingBreakdown } from '@/lib/utils/kitchen';
import { formatCleanDestination, getTimerAlertColor } from './utils';

interface Props {
  tableOrRoom: string;
  roomId?: string;
  status: KitchenTicket['status'];
  timings: TicketTimingBreakdown;
}

export function ChefCardDestination({ tableOrRoom, roomId, status, timings }: Props) {
  const isRoom = Boolean(roomId || tableOrRoom?.toUpperCase().includes('ROOM'));
  const cleanDest = formatCleanDestination(tableOrRoom, isRoom);
  const isDelivered = status === 'SERVED';
  const alertColor = getTimerAlertColor(isDelivered, timings.totalDurationMin);

  const elapsedText = isDelivered
    ? `${timings.totalDurationMin}m total`
    : timings.totalDurationMin < 1
    ? 'Just now'
    : `${timings.totalDurationMin}m ago`;

  return (
    <div className="h-9 px-3.5 flex items-center justify-between border-b border-neutral-100 bg-white gap-2 shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {isRoom ? (
          <Bed className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
        ) : (
          <UtensilsCrossed className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
        )}
        <span className="text-xs font-semibold text-neutral-900 truncate" title={cleanDest}>
          {cleanDest}
        </span>
        <span className="text-neutral-300 shrink-0">•</span>
        <span className="text-[11px] text-neutral-500 shrink-0 font-medium">
          {isRoom ? 'Room Service' : 'Dine-In'}
        </span>
      </div>

      <div
        className="flex items-center gap-1 shrink-0 font-mono text-[11px]"
        title={`Received at ${timings.formattedReceived}`}
      >
        <Clock className={`h-3 w-3 shrink-0 ${alertColor}`} />
        <span className={alertColor}>{elapsedText}</span>
      </div>
    </div>
  );
}
