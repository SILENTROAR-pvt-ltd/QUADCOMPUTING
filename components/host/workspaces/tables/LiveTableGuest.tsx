'use client';

import React from 'react';
import { Fingerprint, Phone, UserRound } from 'lucide-react';
import { tableGuestInfo, type TableOrderFacts, type TableSessionFacts } from '@/lib/utils/table-guest';

interface LiveTableGuestProps {
  session: TableSessionFacts | null;
  order: TableOrderFacts | null;
}

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null);

/** Who is at the table: the guest's name, handle, phone, and the session they are in. */
export function LiveTableGuest({ session, order }: LiveTableGuestProps) {
  if (!session && !order) return null;
  const info = tableGuestInfo(session, order);
  const uidShort = info.sessionUid ? info.sessionUid.replace(/^host-/, '').slice(0, 8) : null;
  return (
    <section aria-label="Guest at this table" className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 font-semibold text-neutral-950">
          <UserRound className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{info.name}</span>
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${info.walkIn ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
          {info.walkIn ? 'Walk-in' : 'Guest app'}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-neutral-600">
        {info.handle && (<><dt>Handle</dt><dd className="font-mono text-neutral-900">@{info.handle.replace(/^@/, '')}</dd></>)}
        {info.phone && (<><dt className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</dt><dd className="font-mono text-neutral-900">{info.phone}</dd></>)}
        {uidShort && (<><dt className="flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Session</dt><dd className="font-mono text-neutral-900">{uidShort}</dd></>)}
        {clock(info.since) && (<><dt>Seated</dt><dd className="text-neutral-900">{clock(info.since)}</dd></>)}
      </dl>
    </section>
  );
}

export default LiveTableGuest;
