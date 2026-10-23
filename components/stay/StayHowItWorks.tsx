'use client';

import React from 'react';
import { CalendarCheck, Wallet, KeyRound, UtensilsCrossed } from 'lucide-react';

const serif = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" };

/** What happens after Reserve, in order, so a guest knows there is nothing to pay now and what to do on arrival. */
export function StayHowItWorks({ inRoomDining }: { inRoomDining: boolean }) {
  const steps = [
    { icon: CalendarCheck, title: 'Reserve for free', hint: 'Pick your dates and room. You get a booking code straight away; nothing is charged online.' },
    { icon: Wallet, title: 'Pay at the front desk', hint: 'On arrival, pay for the room by UPI, cash or card. The desk confirms and your check-in link opens on your phone.' },
    { icon: KeyRound, title: 'Check in from your phone', hint: 'Add your ID photo, and the room is yours.' },
    ...(inRoomDining ? [{ icon: UtensilsCrossed, title: 'Order to your room', hint: 'The QR card in your room orders food and drinks to the door, added to your bill.' }] : []),
  ];
  return (
    <section aria-labelledby="stay-how" className="rounded-[1.75rem] border border-[#e8dfcc] bg-[#fbf9f4] p-5 sm:p-7">
      <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">How it works</p>
      <h3 id="stay-how" className="mt-2 text-[2rem] font-light leading-[1.05] text-[#10231a]" style={serif}>Reserve now, <em className="font-normal text-[#8a6d3f]">pay when you arrive</em></h3>
      <ol className={`mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 ${steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {steps.map(({ icon: Icon, title, hint }, i) => (
          <li key={title} className="relative rounded-2xl border border-[#e8dfcc] bg-[#f8f4ea] p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0f2a1e] text-[#d9c193]"><Icon className="h-4 w-4" aria-hidden /></span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3f]">Step {i + 1}</span>
            </div>
            <p className="mt-3 text-[17px] font-medium text-[#10231a]" style={serif}>{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#10231a]/60">{hint}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
