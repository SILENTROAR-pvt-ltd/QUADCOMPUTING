'use client';

import React, { useMemo } from 'react';
import { Heart, Plus } from 'lucide-react';
import type { MenuItem } from './types';
import type { DishLikesView } from './DiningFeed';
import { DishLikeButton } from './DishLikeButton';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { ItemVegMark } from './cards/VegMark';

interface GuestFavouritesRailProps {
  items: MenuItem[];
  likes: DishLikesView;
  venueName: string;
  getItemCartQuantity: (id: string) => number;
  onAdd: (item: MenuItem) => void;
}

const MAX = 8;
const serif = LUXE_SERIF;

/** The dishes guests love most here, ranked by real likes. Hidden until a dish has at least one. */
export function GuestFavouritesRail({ items, likes, venueName, getItemCartQuantity, onAdd }: GuestFavouritesRailProps) {
  const ranked = useMemo(
    () => items
      .filter((i) => (likes.counts[i.id] || 0) > 0)
      .sort((a, b) => (likes.counts[b.id] || 0) - (likes.counts[a.id] || 0))
      .slice(0, MAX),
    [items, likes.counts],
  );
  if (ranked.length === 0) return null;

  return (
    <section aria-labelledby="favourites-title" className="relative overflow-hidden rounded-[26px] border border-[#e8dfcc] bg-gradient-to-br from-[#fbf6ec] via-[#fbf9f4] to-[#f3ecdc] p-4 sm:p-5">
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.35),transparent_68%)]" />
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6d3f]">
            <Heart size={11} className="fill-rose-500 text-rose-500" /> Guest favourites
          </p>
          <h2 id="favourites-title" className="mt-1 text-[1.45rem] leading-tight text-[#10231a] sm:text-[1.7rem]" style={serif}>Most loved at <em className="text-[#8a6d3f]">{venueName}</em></h2>
        </div>
        <p className="hidden sm:block text-[11px] text-[#10231a]/55">Tap ♥ on any dish to add your vote</p>
      </div>

      <ul className="relative mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ranked.map((item, rank) => {
          const qty = getItemCartQuantity(item.id);
          return (
            <li key={item.id} className="w-40 sm:w-48 shrink-0 snap-start">
              <div className="group h-full rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] p-1.5 shadow-[0_16px_30px_-24px_rgba(16,35,26,0.55)]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#efe7d6]">
                  {item.image_url
                    // eslint-disable-next-line @next/next/no-img-element -- the venue-uploaded photo; images.unoptimized is set, so next/image would not resize it either
                    ? <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="flex h-full w-full items-center justify-center text-2xl text-zinc-400" style={serif}>{item.name.charAt(0)}</div>}
                  <span className="absolute bottom-2 left-2 rounded-full bg-[#0f2a1e]/85 px-2 py-0.5 text-[10px] font-semibold text-[#d9c193]">#{rank + 1}</span>
                  <div className="absolute bottom-2 right-2">
                    <DishLikeButton dishName={item.name} liked={likes.mine.has(item.id)} count={likes.counts[item.id] || 0}
                      busy={likes.pending === item.id} onToggle={() => likes.toggle(item.id)} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 px-1.5 pb-1">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-tight text-[#10231a]" style={serif}>{item.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#8a6d3f]"><ItemVegMark item={item} className="!h-[15px] !w-[15px]" />₹{item.price}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name}`}
                    className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] ring-1 ring-[#d9c193]/35 shadow-md transition-transform active:scale-90 cursor-pointer">
                    <Plus size={15} strokeWidth={2.5} />
                    {qty > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d9c193] px-1 text-[9px] font-bold text-[#0f2a1e]">{qty}</span>}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default GuestFavouritesRail;
