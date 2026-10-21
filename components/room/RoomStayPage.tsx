'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, LogOut, X } from 'lucide-react';
import { StayShell, StayNotice, StaySkeleton, stayButton } from '@/components/stay/StayShell';
import { inr } from '@/components/stay/stay-format';
import { useRoomStay } from './useRoomStay';
import { RoomGate } from './RoomGate';
import { RoomHeader } from './RoomHeader';
import { RoomTabs, type RoomTab } from './RoomTabs';
import { RoomOrderCta } from './RoomOrderCta';
import { RoomServices } from './RoomServices';
import { RoomFolio } from './RoomFolio';
import { RoomFrontDesk } from './RoomFrontDesk';
import { RoomCheckedOut } from './RoomCheckedOut';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** /room/[code]: the guest's own page for the stay, from the QR card in the room. Food is ordered on the venue's own menu. */
export function RoomStayPage({ code }: { code: string }) {
  const search = useSearchParams();
  const stay = useRoomStay(code);
  const [tab, setTab] = useState<RoomTab>('order');
  const [welcome, setWelcome] = useState(() => Boolean(search.get('welcome')));

  if (stay.loading && !stay.data) return <StayShell eyebrow="Your room"><StaySkeleton rows={3} /></StayShell>;
  if (stay.error || !stay.data) {
    return <StayShell><div className="py-16 text-center"><h2 className="text-2xl text-neutral-950" style={serif}>This room link is not valid</h2><p className="mt-2 text-sm text-neutral-500">{stay.error}</p></div></StayShell>;
  }

  const d = stay.data;
  const title = `Room ${d.room.room_number} · ${d.business.name}`;
  if (!d.occupied) {
    // This phone was in the stay that just ended: a farewell, not "no stay here".
    if (stay.checkedOut) return <RoomCheckedOut stay={stay.checkedOut} justLeft={stay.justLeft} onSeen={stay.dismissLeft} />;
    return (
      <StayShell eyebrow="Your room" title={title}>
        <StayNotice>No stay is checked in to this room right now. Just arrived? Once you have paid at the desk, open your check-in link and this card will link to your stay.</StayNotice>
        {d.business.slug && <Link href={`/stay/${encodeURIComponent(d.business.slug)}/checkin`} className={`${stayButton.ghost} mt-6`}>I have a booking</Link>}
      </StayShell>
    );
  }
  if (!d.verified) return <StayShell eyebrow="Your room" title={title}><RoomGate roomNumber={d.room.room_number} venueName={d.business.name} onVerify={stay.verify} /></StayShell>;

  const openBill = () => { setTab('bill'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  // The Services tab holds the stay's two exits; the main tab's rows jump straight to them.
  const openService = (id: string) => { setTab('services'); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  const balance = d.folio?.balance || 0;
  return (
    <StayShell eyebrow="Your room" title={title} right={<RoomFrontDesk data={d} />}>
      <div className="space-y-4">
        {welcome && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <p className="flex-1 leading-relaxed">You are checked in. This page is yours for the stay: order food to the room, ask for anything, and see your bill.</p>
            <button type="button" onClick={() => setWelcome(false)} aria-label="Dismiss" className="-mr-1 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-emerald-700 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
          </div>
        )}
        <RoomHeader data={d} onOpenBill={openBill} />
        {d.checkout_request && tab !== 'services' && (
          <button type="button" onClick={() => openService('checkout-request')}
            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-900">
            <LogOut className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <span className="flex-1"><strong>Check-out requested.</strong> The desk is preparing your bill{balance > 0 ? `: ${inr(balance)} to pay at the desk` : ''}.</span>
          </button>
        )}
        <RoomTabs tab={tab} onChange={setTab} billBadge={balance > 0 ? inr(balance) : null} />
        {tab === 'order' && <RoomOrderCta data={d} code={code} onOpenBill={openBill} onStayLonger={() => openService('late-checkout')} onCheckOut={() => openService('checkout-request')} />}
        {tab === 'services' && <RoomServices data={d} onRequest={stay.request} onRequestLate={stay.requestLateCheckout} onRequestCheckout={stay.requestCheckout} onOpenBill={openBill} />}
        {tab === 'bill' && <RoomFolio data={d} />}
      </div>
    </StayShell>
  );
}
