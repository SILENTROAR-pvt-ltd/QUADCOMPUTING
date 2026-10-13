'use client';

import React, { memo } from 'react';
import { getTicketTimings } from '@/lib/utils/kitchen';
import type { ChefTicketCardProps } from './types';
import { getCardBorderClass } from './card/utils';
import { ChefCardHeader } from './card/ChefCardHeader';
import { ChefCardDestination } from './card/ChefCardDestination';
import { ChefCardItems } from './card/ChefCardItems';
import { ChefCardTimeAudit } from './card/ChefCardTimeAudit';
import { ChefCardActions } from './card/ChefCardActions';

export const ChefTicketCard = memo(function ChefTicketCard({
  ticket,
  onStatusChange,
  onToggleItemDone,
  nowMs = Date.now(),
}: ChefTicketCardProps) {
  const timings = getTicketTimings(ticket, nowMs);
  const borderClass = getCardBorderClass(ticket.status);

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all overflow-hidden ${borderClass}`}
    >
      <ChefCardHeader
        ticketNumber={ticket.ticket_number}
        status={ticket.status}
      />

      <ChefCardDestination
        tableOrRoom={ticket.table_or_room}
        roomId={ticket.room_id}
        status={ticket.status}
        timings={timings}
      />

      {ticket.notes && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">Table note:</span> {ticket.notes}
        </div>
      )}

      <ChefCardItems
        items={ticket.items}
        onToggleItemDone={onToggleItemDone}
      />

      <ChefCardTimeAudit
        timings={timings}
        status={ticket.status}
      />

      <ChefCardActions
        status={ticket.status}
        onStatusChange={onStatusChange}
      />
    </div>
  );
});
