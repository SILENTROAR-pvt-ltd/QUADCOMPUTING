'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BedDouble, ChefHat, Clock, LogOut, UtensilsCrossed } from 'lucide-react';
import { roomMenuHref, roomTableLabel } from '@/lib/guest/room-mode';
import { menuApiUrl, prefetchMenu, writeRoomMenuSeed } from '@/lib/guest/menu-seed';
import { inr } from '@/components/stay/stay-format';
import { RoomOrdersList } from './RoomOrdersList';
import { RoomNudge } from './RoomNudge';
import type { RoomState } from './useRoomStay';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const STEPS = [
  { Icon: UtensilsCrossed, title: 'Choose', hint: 'from the full menu' },
  { Icon: ChefHat, title: 'We cook', hint: 'the kitchen starts at once' },
  { Icon: BedDouble, title: 'At your door', hint: 'added to your room bill' },
];

/**
 * Ordering food to the room happens on the venue's own menu, not in a copy of it here: one clear button, straight to that
 * menu in room mode. The orders come back to this page's bill. The kitchen's hours are shown, and the button stays
 * usable when it is closed so the guest can browse; the menu itself refuses an order until the kitchen opens.
 */
interface Props { data: RoomState; code: string; onOpenBill: () => void; onStayLonger?: () => void; onCheckOut?: () => void }

export function RoomOrderCta({ data, code, onOpenBill, onStayLonger, onCheckOut }: Props) {
  const { dining, business, room, folio, late_checkout: late } = data;
  const balance = folio?.balance || 0;
  // Offered on the main tab while the room is free after the guest and the desk has options to offer.
  const longer = late && late.available && late.options.length > 0 && !late.request && !data.checkout_request ? late.options[0] : null;
  const open = dining.enabled && dining.open;
  const orders = folio?.orders || [];
  const href = roomMenuHref(business.id, code, room.room_number);
  const router = useRouter();

  // The guest is one tap from the menu: read it now, and tell the menu what it needs to know about the room, so the
  // menu page opens full instead of on a skeleton.
  useEffect(() => {
    if (!dining.enabled) return;
    writeRoomMenuSeed(code, { roomNumber: room.room_number, venueName: business.name, dining: { enabled: dining.enabled, open: dining.open, message: dining.message } });
    void prefetchMenu(menuApiUrl(business.id, roomTableLabel(room.room_number)));
    router.prefetch(href);
  }, [code, href, router, business.id, business.name, room.room_number, dining.enabled, dining.open, dining.message]);

  if (!dining.enabled) {
    return <div role="status" className="rounded-[1.5rem] border border-neutral-200 bg-white p-6 text-sm text-neutral-600">In-room dining is not offered here. Please reach the front desk to arrange a meal.</div>;
  }
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#e6d9b8] bg-white shadow-[0_18px_40px_-34px_rgba(10,50,34,0.5)]">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-medium tracking-tight text-neutral-950 sm:text-4xl" style={serif}>Hungry?</h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-neutral-600">Order from the full menu. It comes to Room {room.room_number} and goes on your room bill: nothing to pay now.</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-neutral-950 text-white"><UtensilsCrossed className="h-5 w-5" aria-hidden /></span>
          </div>

          <p className={`mt-5 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${open ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <Clock className="h-3.5 w-3.5" aria-hidden /> {dining.message}
          </p>

          <Link href={href}
            className="mt-5 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-base font-semibold text-white shadow-[0_14px_26px_-14px_rgba(0,0,0,0.7)] transition hover:bg-neutral-800 active:scale-[0.99]">
            {open ? 'Order food to my room' : 'Browse the menu'} <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          {!open && <p className="mt-2 text-center text-xs text-neutral-500">You can look at the menu now; ordering opens with the kitchen.</p>}

          <ol className="mt-6 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-5">
            {STEPS.map(({ Icon, title, hint }, i) => (
              <li key={title} className="text-center">
                <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[#faf9f6] text-neutral-700 ring-1 ring-[#e6d9b8]"><Icon className="h-4 w-4" aria-hidden /></span>
                <p className="mt-2 text-xs font-semibold text-neutral-900">{i + 1}. {title}</p>
                <p className="text-[11px] leading-snug text-neutral-500">{hint}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-center text-[11px] text-neutral-400">Food and drinks only. Anything else is arranged with the front desk.</p>
        </div>
      </section>

      {/* Leaving: the two doors out of the stay, right under the food, where the guest already is. */}
      {!data.checkout_request && onCheckOut && (
        <RoomNudge Icon={LogOut} title="Leaving today? Request check-out" onClick={onCheckOut}
          hint={`One tap tells the desk; your bill${balance > 0 ? ` (${inr(balance)} so far)` : ''} will be ready to pay when you come down.`} />
      )}
      {longer && onStayLonger && (
        <RoomNudge Icon={Clock} tone="amber" title="Want to stay a little longer?" onClick={onStayLonger}
          hint={`Your room is free after you: ${longer.label.toLowerCase()} for ${longer.fee > 0 ? inr(longer.fee) : 'no charge'}${late && late.options.length > 1 ? ', or later' : ''}. Paid at the desk.`} />
      )}

      {orders.length > 0 && (
        <section className="rounded-[1.5rem] border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Your orders · {inr(folio?.dining_total || 0)}</p>
            <button type="button" onClick={onOpenBill} className="cursor-pointer text-xs font-semibold text-neutral-700 underline-offset-4 hover:underline">See bill</button>
          </div>
          <div className="mt-1"><RoomOrdersList orders={orders} limit={3} /></div>
        </section>
      )}
    </div>
  );
}
