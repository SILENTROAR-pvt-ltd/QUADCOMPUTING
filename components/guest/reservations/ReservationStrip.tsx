'use client';

import React, { useCallback, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { ReserveSheet } from './ReserveSheet';
import { useVenueStatus } from './useVenueStatus';
import { fmt12 } from './ReserveFields';

interface Props {
  venueId: string;
  venueName: string;
  initialName: string;
  initialPhone: string;
}

/** The menu's reserve tile: shows whether the venue is open now and opens the booking sheet. Hidden when booking is off. */
export function ReservationStrip({ venueId, venueName, initialName, initialPhone }: Props) {
  const status = useVenueStatus(venueId);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!status || !status.reservationsEnabled) return null;

  const detail = status.opensAt
    ? status.isOpen ? `Open now · until ${fmt12(status.closesAt!)}` : `Opens ${fmt12(status.opensAt)}`
    : 'Closed today';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-zinc-200/70 transition active:scale-[0.98]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100">
          <CalendarDays className="h-4 w-4 text-zinc-900" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-zinc-900">Reserve a table</span>
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-zinc-300'}`} aria-hidden />
            <span className="truncate">{detail}</span>
          </span>
        </span>
      </button>
      {open && <ReserveSheet venueId={venueId} venueName={venueName} initialName={initialName} initialPhone={initialPhone} onClose={close} />}
    </>
  );
}
