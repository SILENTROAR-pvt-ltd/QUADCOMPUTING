'use client';

import React from 'react';
import Link from 'next/link';
import { BadgeCheck, Receipt, Sparkles, BedDouble } from 'lucide-react';
import { BottomSheet } from '@/components/guest/shared/BottomSheet';
import { StayShell, stayButton } from '@/components/stay/StayShell';
import { inr, whenIst } from '@/components/stay/stay-format';
import { roomTableLabel } from '@/lib/guest/room-mode';
import type { LastStay } from './last-stay';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/**
 * The stay is over: the desk settled the bill and checked the room out. The page thanks the guest and points to where
 * the bill and the cashback now live (the Me tab under their Vibers ID). The first time this open page sees the stay end,
 * the same message comes up as a sheet, so a guest watching the page while paying at the desk is told at once.
 */
export function RoomCheckedOut({ stay, justLeft, onSeen }: { stay: LastStay; justLeft: boolean; onSeen: () => void }) {
  const meHref = `/menu?cafe_id=${encodeURIComponent(stay.venue.id)}&table=${encodeURIComponent(roomTableLabel(stay.roomNumber))}&tab=me`;
  const stayHref = `/stay/${encodeURIComponent(stay.venue.slug || stay.venue.id)}`;
  const body = (
    <>
      <p className="text-sm leading-relaxed text-neutral-600">
        Your bill was settled at the desk{stay.checkedOutAt ? ` on ${whenIst(stay.checkedOutAt)}` : ''}: the room{stay.dining > 0 ? ` and ${inr(stay.dining)} of food and drinks` : ''}, {stay.nights} night{stay.nights === 1 ? '' : 's'} at {stay.venue.name}.
      </p>
      {stay.dining > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
          <span>Ordered with your Vibers ID? <strong>7% cashback</strong> on what you ordered is in your wallet now, with the invoice.</span>
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2.5">
        <Link href={meHref} className={stayButton.primary}><Receipt className="h-4 w-4" aria-hidden /> See my bill &amp; cashback</Link>
        <Link href={stayHref} className={stayButton.ghost}><BedDouble className="h-4 w-4" aria-hidden /> Stay again</Link>
      </div>
    </>
  );

  return (
    <StayShell eyebrow="Your room" title={`Room ${stay.roomNumber} · ${stay.venue.name}`}>
      <section className="rounded-[2rem] border border-[#e6d9b8] bg-white p-6 shadow-[0_24px_60px_-36px_rgba(10,50,34,0.5)] sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Checked out</span>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-neutral-950 sm:text-4xl" style={serif}>Thank you for staying with us</h2>
        <div className="mt-3">{body}</div>
      </section>
      {justLeft && (
        <BottomSheet labelledBy="checked-out-title" onClose={onSeen}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white"><BadgeCheck className="h-6 w-6" aria-hidden /></span>
          <h2 id="checked-out-title" className="mt-4 text-2xl font-medium text-neutral-950" style={serif}>Bill settled. You are checked out.</h2>
          <div className="mt-2">{body}</div>
          <button type="button" onClick={onSeen} className="mt-3 w-full cursor-pointer py-2 text-center text-xs font-semibold text-neutral-500 hover:text-neutral-900">Close</button>
        </BottomSheet>
      )}
    </StayShell>
  );
}
