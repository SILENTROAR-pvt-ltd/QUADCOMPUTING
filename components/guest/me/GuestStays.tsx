'use client';

import React from 'react';
import Link from 'next/link';
import { BedDouble } from 'lucide-react';
import { useStayHub } from '@/components/guest/stay/useStayHub';
import { StayBookingRow } from '@/components/guest/stay/StayBookingRow';
import { ListSkeleton } from '@/components/guest/shared/ListSkeleton';

/** The guest's stays: the room they are in now, and every reservation made under their Vibers ID, at every venue. */
export function GuestStays({ cafeId, signedIn, checking = false }: { cafeId: string; signedIn: boolean; /** The sign-in check has not answered yet: never say "sign in" to a guest who is. */ checking?: boolean }) {
  const { data, loading } = useStayHub(cafeId, 'all');
  const roomHref = data?.my_room ? `/room/${encodeURIComponent(data.my_room.code)}` : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white" aria-label="Your stays">
      <div className="px-5 pt-5 sm:px-6">
        <h3 className="font-serif text-lg text-neutral-950">Stays</h3>
        <p className="mt-1 text-sm text-neutral-500">{signedIn || checking ? 'Every reservation under your Vibers ID, at every venue.' : 'Sign in on this phone to see your reservations at every venue.'}</p>
      </div>
      {data?.my_room && roomHref && (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:mx-6">
          <span className="flex items-center gap-2.5 text-sm text-emerald-900"><BedDouble className="h-4 w-4" aria-hidden /><span><strong>Room {data.my_room.room_number}</strong>{data.my_room.room_type ? ` · ${data.my_room.room_type}` : ''} · you are checked in</span></span>
          <Link href={roomHref} className="shrink-0 cursor-pointer rounded-full bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white">My room</Link>
        </div>
      )}
      <div className="px-5 pb-2 sm:px-6">
        {(loading && !data) || (checking && !signedIn) ? <ListSkeleton label="Loading stays" /> : !signedIn || !data || data.stays.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">{signedIn ? 'No reservations yet. Reserve a room from the venue\'s stay page.' : ''}</p>
        ) : (
          <ul className="divide-y divide-neutral-100">{data.stays.map((s) => <StayBookingRow key={s.id} stay={s} showVenue roomHref={roomHref} />)}</ul>
        )}
      </div>
    </section>
  );
}
