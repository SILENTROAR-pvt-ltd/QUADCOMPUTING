'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { KeyRound, BedDouble } from 'lucide-react';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';
import { useStayHub } from '@/components/guest/stay/useStayHub';
import { useStayShowcase } from './useStayShowcase';
import { StayMyRoom } from './StayMyRoom';
import { useStayAuthGate } from './useStayAuthGate';
import { StayShell, StayNotice, StaySkeleton, stayButton } from './StayShell';
import { StayHero } from './StayHero';
import { StayAccountBar } from './StayAccountBar';
import { StayDateStrip } from './StayDateStrip';
import { StayHowItWorks } from './StayHowItWorks';
import { RoomTypeCard } from './RoomTypeCard';
import { BookingSheet } from './BookingSheet';
import { nightsBetween } from './stay-format';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** /stay/[venue]: the rooms on offer, free-for-your-dates counts, reservation through the Vibers ID, and the door to self check-in. */
export function StayShowcasePage({ venueParam }: { venueParam: string }) {
  const s = useStayShowcase(venueParam);
  const gate = useStayAuthGate(s.venue?.id || '');
  // The guest's own stay here: the room this phone is confirmed in, or a live reservation. Re-read on sign-in and sign-out.
  const hub = useStayHub(s.venue?.id || '').data;
  const myRoom = hub?.my_room || null;
  const nights = nightsBetween(s.checkIn, s.checkOut);
  const cover = useMemo(() => s.types.find((t) => t.photos.length > 0)?.photos[0] || null, [s.types]);

  if (s.loading && !s.venue) return <StayShell eyebrow="Stay"><StaySkeleton rows={3} /></StayShell>;
  if (s.error || !s.venue) {
    return (
      <StayShell>
        <div className="mx-auto max-w-md py-16 text-center">
          <h2 className="text-2xl font-medium text-neutral-950" style={serif}>We could not open this venue</h2>
          <p className="mt-2 text-sm text-neutral-500">{s.error}</p>
          <button type="button" onClick={() => void s.reload()} className={`${stayButton.ghost} mt-6`}>Try again</button>
        </div>
      </StayShell>
    );
  }

  const venue = s.venue;
  const freeCount = s.types.reduce((n, t) => n + (t.available_for_dates ?? t.vacant_now), 0);
  return (
    <StayShell eyebrow="Stay" title={venue.name} right={
      myRoom ? <Link href={`/room/${encodeURIComponent(myRoom.code)}`} className={stayButton.liveSm}><BedDouble className="h-3.5 w-3.5" aria-hidden /> My room</Link>
        : venue.self_checkin_enabled ? <Link href={`/stay/${encodeURIComponent(venueParam)}/checkin`} className={stayButton.ghostSm}><KeyRound className="h-3.5 w-3.5" aria-hidden /> Check in</Link> : null
    }>
      <div className="space-y-5">
        <StayHero venue={venue} venueParam={venueParam} coverPhoto={cover} roomsCount={s.types.length} myRoom={myRoom} />
        {hub && <StayMyRoom hub={hub} venueId={venue.id} />}
        <StayAccountBar account={gate.account} loading={gate.loading} signingOut={gate.signingOut} onSignIn={gate.openSignIn} onSignOut={() => void gate.logout()} />
        <StayDateStrip checkIn={s.checkIn} checkOut={s.checkOut} onChange={s.setDates} error={s.range?.error} />

        {s.types.length === 0 ? (
          <StayNotice>This venue has not listed its rooms yet. Call them at {venue.phones[0] || 'the number on their menu'}.</StayNotice>
        ) : (
          <section id="rooms" aria-labelledby="stay-rooms" className="scroll-mt-20">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">Choose a room</p>
                <h3 id="stay-rooms" className="mt-1 text-2xl font-medium text-neutral-950" style={serif}>Rooms</h3>
              </div>
              <p className="text-xs text-neutral-500" aria-live="polite">{s.loading ? 'Checking availability…' : `${freeCount} free for your dates`}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {s.types.map((t) => <RoomTypeCard key={t.id} type={t} nights={nights} onBook={gate.reserve} />)}
            </div>
          </section>
        )}

        <StayHowItWorks inRoomDining={venue.in_room_dining_enabled} />
      </div>

      <GuestAuthSheet isOpen={gate.authOpen} venueId={venue.id} tableNumber="" notice={gate.notice}
        onClose={gate.closeAuth} onSignedIn={gate.onSignedIn} onBrowse={gate.onBrowse} />
      {gate.booking && (
        <BookingSheet venueId={venue.id} type={gate.booking} checkIn={s.checkIn} checkOut={s.checkOut} nights={nights} account={gate.account}
          onClose={() => { gate.closeBooking(); void s.reload(); }} />
      )}
    </StayShell>
  );
}
