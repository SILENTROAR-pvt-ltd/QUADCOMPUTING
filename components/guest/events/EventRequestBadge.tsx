'use client';

import React from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import type { MyEventStatus } from '@/lib/services/live-events/my-event-status';

const LOOK = {
  INTERESTED: { Icon: Clock3, cls: 'border-[#d9c193] bg-[#fbf6e8] text-[#6f5631]', title: 'Request sent', line: 'Waiting for the venue to confirm your place.' },
  CONFIRMED: { Icon: CheckCircle2, cls: 'border-[#0f2a1e]/20 bg-[#eef3ee] text-[#173a2a]', title: "You're going", line: 'The venue confirmed your place. See you there!' },
  DECLINED: { Icon: XCircle, cls: 'border-rose-200 bg-rose-50/80 text-rose-800', title: 'Not confirmed this time', line: 'The venue could not fit your party. You can ask again.' },
} as const;

/** The venue's answer to the guest's request to join this event, on the card itself. */
export function EventRequestBadge({ mine }: { mine: MyEventStatus }) {
  const look = LOOK[mine.status] ?? LOOK.INTERESTED;
  const { Icon } = look;
  return (
    <div role="status" className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 ${look.cls}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${mine.status === 'INTERESTED' ? 'animate-pulse' : ''}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight">{look.title} · party of {mine.party_size}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug opacity-80">{look.line}</p>
      </div>
    </div>
  );
}

/** What the card's button says once the guest has asked: going needs no button; waiting can be changed; declined can ask again. */
export function requestButtonLabel(mine: MyEventStatus | undefined, full: boolean): string | null {
  if (!mine) return full ? 'Fully booked' : "I'm Interested";
  if (mine.status === 'CONFIRMED') return null;
  if (mine.status === 'DECLINED') return full ? 'Fully booked' : 'Ask again';
  return 'Change request';
}
