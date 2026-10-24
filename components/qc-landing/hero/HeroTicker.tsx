import React from 'react';
import { BedDouble, ChefHat, PackageOpen, ReceiptText, Sparkles, Truck, UtensilsCrossed } from 'lucide-react';
import s from '@/components/vibers/luxe.module.css';

// A Saturday at the sample café, as the control centre hears it. Every line is something the product really does.
const EVENTS = [
  { icon: UtensilsCrossed, text: 'Table T-04 · 2 Cappuccino, 1 Seafood Paella sent to the kitchen' },
  { icon: ChefHat, text: 'KOT #141 ready · Grill station · 6 min' },
  { icon: Sparkles, text: 'Vibey · “something to share” → Seafood Paella added' },
  { icon: BedDouble, text: 'Room 204 · late check-out requested' },
  { icon: Truck, text: 'Delivery DLV-7F3A · out for delivery · 2.4 km' },
  { icon: ReceiptText, text: 'Bill settled · ₹1,008 · UPI · 7% to the guest’s wallet' },
  { icon: PackageOpen, text: 'Milk below reorder level · 6 L on the purchase list' },
];

/** A slow ribbon of the floor's live events under the hero (doubled, so it loops without a seam; it stops on hover). */
export function HeroTicker() {
  const row = (copy: number) => EVENTS.map((e) => (
    <li key={`${copy}-${e.text}`} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-2.5 px-6 text-[12.5px] text-[#f6f3ec]/70">
      <e.icon aria-hidden="true" className="h-3.5 w-3.5 text-[#d9c193]" />
      {e.text}
      <span aria-hidden="true" className="ml-6 h-1 w-1 rounded-full bg-[#f6f3ec]/25" />
    </li>
  ));
  return (
    <div className="relative border-y border-white/[0.07] bg-black/30 py-3.5">
      <p className="absolute left-0 top-0 z-10 hidden h-full items-center gap-2 bg-gradient-to-r from-[#0c0f0d] via-[#0c0f0d] to-transparent pl-4 pr-12 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193] sm:flex sm:pl-8">
        <span aria-hidden="true" className={`${s.pulse} h-1.5 w-1.5 rounded-full bg-emerald-400`} /> Live on the floor
      </p>
      <div className="overflow-hidden" aria-label="What the control centre sees on a busy evening (sample café)">
        <ul className={s.marquee}>{row(0)}{row(1)}</ul>
      </div>
    </div>
  );
}
