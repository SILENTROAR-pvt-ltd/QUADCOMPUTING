'use client';

import React from 'react';
import { Fingerprint, Phone, UserRound } from 'lucide-react';
import { tableGuestInfo, type TableOrderFacts, type TableSessionFacts } from '@/lib/utils/table-guest';

interface LiveTableGuestProps {
  session: TableSessionFacts | null;
  order: TableOrderFacts | null;
}

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null);

/** Who is at the table, on two short lines: the guest's name and where they ordered from, then handle, phone and seating time. */
export function LiveTableGuest({ session, order }: LiveTableGuestProps) {
  if (!session && !order) return null;
  const info = tableGuestInfo(session, order);
  const uidShort = info.sessionUid ? info.sessionUid.replace(/^host-/, '').slice(0, 8) : null;
  const seated = clock(info.since);
  return (
    <section aria-label="Guest at this table" className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 font-semibold text-neutral-950">
          <UserRound className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{info.name}</span>
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${info.walkIn ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
          {info.walkIn ? 'Walk-in' : 'Guest app'}
        </span>
      </div>
      {(info.handle || info.phone || seated || uidShort) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-600">
          {info.handle && <span className="font-mono text-neutral-900">@{info.handle.replace(/^@/, '')}</span>}
          {info.phone && <span className="inline-flex items-center gap-1 font-mono text-neutral-900"><Phone className="h-3 w-3" aria-hidden /> {info.phone}</span>}
          {seated && <span>Seated <span className="text-neutral-900">{seated}</span></span>}
          {uidShort && <span className="hidden items-center gap-1 sm:inline-flex"><Fingerprint className="h-3 w-3" aria-hidden /> <span className="font-mono text-neutral-900">{uidShort}</span></span>}
        </p>
      )}
    </section>
  );
}

export default LiveTableGuest;
