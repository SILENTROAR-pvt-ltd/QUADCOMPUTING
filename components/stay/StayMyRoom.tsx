'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BedDouble, UtensilsCrossed, Search } from 'lucide-react';
import { roomMenuHref } from '@/lib/guest/room-mode';
import { RoomLookupForm } from '@/components/guest/room/RoomLookupForm';
import type { StayHub } from '@/components/guest/stay/useStayHub';
import { stayButton } from './StayShell';
import { shortDate } from './stay-format';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/**
 * The checked-in guest's card at the top of the stay page: their room, with the door to it and to ordering. A guest
 * whose stay is live but whose phone is not yet confirmed in the room (they checked in on another phone, or at the
 * desk) is offered the room lookup instead, so the same page still leads them in.
 */
export function StayMyRoom({ hub, venueId }: { hub: StayHub; venueId: string }) {
  const router = useRouter();
  const [lookup, setLookup] = useState(false);
  const room = hub.my_room;
  const live = hub.stays.find((s) => s.state === 'in_house');
  if (!room && !live) return null;

  return (
    <section aria-label="Your room" className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_18px_40px_-30px_rgba(4,120,87,0.6)] sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-800">You are checked in</p>
      {room ? (
        <>
          <h3 className="mt-2 text-2xl font-medium text-neutral-950" style={serif}>Room {room.room_number}{room.room_type ? ` · ${room.room_type}` : ''}</h3>
          <p className="mt-1 text-sm text-neutral-600">{room.check_out ? `Until ${shortDate(room.check_out)}. ` : ''}Your room page has your bill, services and the front desk.</p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Link href={`/room/${encodeURIComponent(room.code)}`} className={stayButton.live}><BedDouble className="h-4 w-4" aria-hidden /> My room</Link>
            {hub.venue.in_room_dining_enabled && (
              <Link href={roomMenuHref(venueId, room.code, room.room_number)} className={stayButton.ghost}><UtensilsCrossed className="h-4 w-4" aria-hidden /> Order to room</Link>
            )}
          </div>
        </>
      ) : (
        <>
          <h3 className="mt-2 text-2xl font-medium text-neutral-950" style={serif}>{live!.room_type || 'Your stay'} · {live!.code}</h3>
          <p className="mt-1 text-sm text-neutral-600">Until {shortDate(live!.check_out)}. Confirm this phone with the last four digits of your mobile to open your room page.</p>
          <button type="button" onClick={() => setLookup((v) => !v)} aria-expanded={lookup} className={`${stayButton.live} mt-4`}><Search className="h-4 w-4" aria-hidden /> Find my room</button>
          {lookup && <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4"><RoomLookupForm cafeId={venueId} askRoom={false} onFound={(r) => router.push(`/room/${encodeURIComponent(r.code)}`)} /></div>}
        </>
      )}
    </section>
  );
}
