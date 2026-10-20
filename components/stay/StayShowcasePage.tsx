'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStayShowcase } from './useStayShowcase';
import { StayShell, StayNotice, StaySpinner, stayButton } from './StayShell';
import { StayHero } from './StayHero';
import { StayDateStrip } from './StayDateStrip';
import { RoomTypeCard } from './RoomTypeCard';
import { BookingSheet } from './BookingSheet';
import { nightsBetween, type StayType } from './stay-format';

/** /stay/[venue]: the rooms on offer, free-for-your-dates counts, reservation, and the door to self check-in. */
export function StayShowcasePage({ venueParam }: { venueParam: string }) {
  const s = useStayShowcase(venueParam);
  const [booking, setBooking] = useState<StayType | null>(null);
  const nights = nightsBetween(s.checkIn, s.checkOut);
  const cover = useMemo(() => s.types.find((t) => t.photos.length > 0)?.photos[0] || null, [s.types]);

  if (s.loading && !s.venue) return <StayShell><StaySpinner label="Opening the venue" /></StayShell>;
  if (s.error || !s.venue) {
    return (
      <StayShell>
        <div className="mx-auto max-w-md py-16 text-center">
          <h2 className="font-serif text-2xl font-light text-white">We could not open this venue</h2>
          <p className="mt-2 text-sm text-neutral-400">{s.error}</p>
          <button type="button" onClick={() => void s.reload()} className={`${stayButton.ghost} mt-6`}>Try again</button>
        </div>
      </StayShell>
    );
  }

  const venue = s.venue;
  return (
    <StayShell eyebrow="Stay" title={venue.name} right={
      venue.self_checkin_enabled ? <Link href={`/stay/${encodeURIComponent(venueParam)}/checkin`} className={`${stayButton.ghost} h-9 px-3 text-xs`}>Self check-in</Link> : null
    }>
      <div className="space-y-5">
        <StayHero venue={venue} venueParam={venueParam} coverPhoto={cover} />
        <StayDateStrip checkIn={s.checkIn} checkOut={s.checkOut} onChange={s.setDates} error={s.range?.error} />

        {s.types.length === 0 ? (
          <StayNotice>This venue has not listed its rooms yet. Call them at {venue.phones[0] || 'the number on their menu'}.</StayNotice>
        ) : (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h3 className="font-serif text-xl font-light text-white">Rooms</h3>
              <p className="text-xs text-neutral-500">{s.loading ? 'Checking availability…' : `${s.types.reduce((n, t) => n + (t.available_for_dates ?? t.vacant_now), 0)} free for your dates`}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {s.types.map((t) => <RoomTypeCard key={t.id} type={t} nights={nights} onBook={setBooking} />)}
            </div>
          </section>
        )}

        <StayNotice>
          Reservations are confirmed straight away and paid at the property. {venue.in_room_dining_enabled && 'Once checked in, the QR card in your room orders food to the room and adds it to your bill.'}
        </StayNotice>
      </div>

      {booking && <BookingSheet venueId={venue.id} type={booking} checkIn={s.checkIn} checkOut={s.checkOut} nights={nights} onClose={() => { setBooking(null); void s.reload(); }} />}
    </StayShell>
  );
}
