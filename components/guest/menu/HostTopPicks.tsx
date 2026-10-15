'use client';

import React, { useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import type { MenuItem } from './types';

interface HostTopPicksProps {
  /** Dish ids the venue picked, in the order it chose. */
  featured: string[];
  items: MenuItem[];
  getItemCartQuantity: (id: string) => number;
  onAdd: (item: MenuItem) => void;
}

/** The dishes the venue wants guests to try first, in the venue's order, under the live offers. Hidden when none are picked or none are on the menu. */
export function HostTopPicks({ featured, items, getItemCartQuantity, onAdd }: HostTopPicksProps) {
  const picks = useMemo(() => {
    const byId = new Map(items.map((i) => [String(i.id).toLowerCase(), i]));
    return featured
      .map((id) => byId.get(id.toLowerCase()))
      .filter((i): i is MenuItem => Boolean(i) && i!.available !== false);
  }, [featured, items]);

  // Two copies of the list, so the row loops without a visible jump.
  const drifting = picks.length >= 3;
  const rail = drifting ? [...picks, ...picks] : picks;

  if (picks.length === 0) return null;

  return (
    <section aria-label="Top picks" className="w-full">
      <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
        <Sparkles className="h-3 w-3 text-[#4a3a8c]" aria-hidden />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">Top picks</h2>
      </div>

      {/* The row drifts from right to left and loops; it stops under a finger or the pointer. With reduced motion it is a row to swipe. */}
      <div className="group relative overflow-hidden motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none]">
      <ul
        className={`flex w-max pb-1 ${drifting ? 'animate-offers-rtl group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] motion-reduce:animate-none' : ''}`}
        style={drifting ? { animationDuration: `${Math.max(16, picks.length * 6)}s` } : undefined}
      >
        {rail.map((item, copy) => {
          const qty = getItemCartQuantity(item.id);
          return (
            <li key={`${item.id}-${copy}`} className="mr-2.5 w-[138px] shrink-0 sm:w-[160px]">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_18px_-14px_rgba(60,40,120,0.45)]">
                <div className="relative aspect-[4/3] bg-zinc-100">
                  {item.image_url
                    // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
                    ? <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center font-sans text-xl font-semibold text-zinc-400">{item.name.charAt(0)}</div>}
                </div>
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[12.5px] font-semibold text-zinc-950">{item.name}</p>
                    <p className="font-sans text-[11.5px] font-medium text-zinc-600">₹{item.price}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name}`}
                    className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0A3222] text-white transition-transform active:scale-90 cursor-pointer">
                    <Plus size={15} strokeWidth={2.5} />
                    {qty > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-zinc-950">{qty}</span>}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}

export default HostTopPicks;
