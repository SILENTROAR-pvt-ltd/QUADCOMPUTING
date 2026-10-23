'use client';

import React, { useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import type { MenuItem } from './types';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { ItemVegMark } from './cards/VegMark';

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
      <div className="mb-2.5 flex items-end justify-between gap-2 px-0.5">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]"><Sparkles className="h-3 w-3" aria-hidden /> Top picks</p>
          <h2 className="mt-0.5 text-[1.45rem] leading-tight text-[#10231a]" style={LUXE_SERIF}>The house <em className="font-normal text-[#8a6d3f]">recommends</em></h2>
        </div>
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
            <li key={`${item.id}-${copy}`} className="mr-3 w-[142px] shrink-0 sm:w-[164px]">
              <div className="overflow-hidden rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] p-1.5 shadow-[0_16px_30px_-26px_rgba(16,35,26,0.6)]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#efe7d6]">
                  {item.image_url
                    // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
                    ? <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-2xl italic text-[#b08d57]" style={LUXE_SERIF}>{item.name.charAt(0)}</div>}
                </div>
                <div className="flex items-center justify-between gap-1.5 px-1.5 pb-1 pt-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-tight text-[#10231a]" style={LUXE_SERIF}>{item.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[#8a6d3f]"><ItemVegMark item={item} className="!h-[15px] !w-[15px]" />₹{item.price}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name}`}
                    className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] ring-1 ring-[#d9c193]/35 transition-transform active:scale-90 cursor-pointer">
                    <Plus size={15} strokeWidth={2.5} />
                    {qty > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d9c193] px-1 text-[9px] font-bold text-[#0f2a1e]">{qty}</span>}
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
