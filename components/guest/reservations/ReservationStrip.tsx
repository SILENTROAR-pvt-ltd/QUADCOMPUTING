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
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[20px] bg-[#fbf9f4] px-3 py-2.5 text-left shadow-[0_14px_30px_-26px_rgba(16,35,26,0.55)] ring-1 ring-[#e8dfcc] transition active:scale-[0.98]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f2a1e]">
          <CalendarDays className="h-4 w-4 text-[#d9c193]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[#10231a]">Reserve a table</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#10231a]/55">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-[#10231a]/25'}`} aria-hidden />
            <span className="truncate">{detail}</span>
          </span>
        </span>
      </button>
      {open && <ReserveSheet venueId={venueId} venueName={venueName} initialName={initialName} initialPhone={initialPhone} onClose={close} />}
    </>
  );
}
