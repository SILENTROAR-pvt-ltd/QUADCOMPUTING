'use client';

import React from 'react';
import Link from 'next/link';
import { shortDate, plural } from '@/components/stay/stay-format';
import type { GuestStay, StayState } from '@/lib/services/stay/stay-hub.service';

const STATE: Record<StayState, { label: string; cls: string }> = {
  requested: { label: 'Requested', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  upcoming: { label: 'Upcoming', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  in_house: { label: 'In house', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  stayed: { label: 'Stayed', cls: 'bg-neutral-100 text-neutral-700 ring-neutral-200' },
  missed: { label: 'Not used', cls: 'bg-neutral-100 text-neutral-500 ring-neutral-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  declined: { label: 'Declined', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  no_show: { label: 'No show', cls: 'bg-neutral-100 text-neutral-500 ring-neutral-200' },
};

/** One reservation: where and when, its code, where it stands, and the next step when there is one. */
export function StayBookingRow({ stay, showVenue = false, roomHref }: { stay: GuestStay; showVenue?: boolean; roomHref?: string | null }) {
  const s = STATE[stay.state];
  const venue = stay.venue.slug || stay.venue.id;
  const action = stay.state === 'upcoming' && !showVenue ? { href: `/stay/${encodeURIComponent(venue)}/checkin`, label: 'Check in' }
    : stay.state === 'upcoming' ? { href: `/stay/${encodeURIComponent(venue)}`, label: 'View' }
    : stay.state === 'in_house' && roomHref ? { href: roomHref, label: 'My room' } : null;
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">{showVenue ? `${stay.venue.name} · ` : ''}{stay.room_type || 'Room'}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{shortDate(stay.check_in)} → {shortDate(stay.check_out)} · {plural(stay.nights, 'night')} · {plural(stay.guests, 'guest')}</p>
        <p className="mt-1 flex items-center gap-2 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${s.cls}`}>{s.label}</span>
          {stay.code && <span className="font-mono text-neutral-500">{stay.code}</span>}
        </p>
      </div>
      {action && <Link href={action.href} className="shrink-0 cursor-pointer rounded-full bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800">{action.label}</Link>}
    </li>
  );
}
