'use client';

import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import type { RoomState } from './useRoomStay';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/**
 * Everything the guest has asked the desk for this stay, newest first: "On its way" until the desk marks it done, then
 * "Done". The desk's tick reaches this page at once (a push on the room's channel), so nobody has to ask twice.
 */
export function RoomRequestsCard({ requests }: { requests: NonNullable<RoomState['requests']> }) {
  if (requests.length === 0) return null;
  return (
    <section aria-label="Your requests" className="rounded-[1.5rem] border border-neutral-200 bg-white p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Your requests</h3>
      <ul className="mt-2 divide-y divide-neutral-100">
        {requests.slice(0, 12).map((r) => {
          const done = r.status === 'done';
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className={`truncate text-sm ${done ? 'text-neutral-600' : 'font-semibold text-neutral-950'}`}>{r.message || 'Request to the desk'}</p>
                <p className="text-[11px] text-neutral-400">Sent {time(r.at)}</p>
              </div>
              {done
                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Done</span>
                : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"><Clock className="h-3.5 w-3.5" aria-hidden /> On its way</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
