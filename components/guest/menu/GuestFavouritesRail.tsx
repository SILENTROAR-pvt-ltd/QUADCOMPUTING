'use client';

import React, { useMemo } from 'react';
import { Heart, Plus } from 'lucide-react';
import type { MenuItem } from './types';
import type { DishLikesView } from './DiningFeed';
import { DishLikeButton } from './DishLikeButton';

interface GuestFavouritesRailProps {
  items: MenuItem[];
  likes: DishLikesView;
  venueName: string;
  getItemCartQuantity: (id: string) => number;
  onAdd: (item: MenuItem) => void;
}

const MAX = 8;
const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

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
    <section aria-labelledby="favourites-title" className="relative overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/70 p-4 sm:p-5">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-rose-300/25 blur-3xl" />
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-600">
            <Heart size={11} className="fill-rose-500 text-rose-500" /> Guest favourites
          </p>
          <h2 id="favourites-title" className="mt-1 text-lg sm:text-xl text-zinc-950" style={serif}>Most loved at {venueName}</h2>
        </div>
        <p className="hidden sm:block text-[11px] text-zinc-500">Tap ♥ on any dish to add your vote</p>
      </div>

      <ul className="relative mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ranked.map((item, rank) => {
          const qty = getItemCartQuantity(item.id);
          return (
            <li key={item.id} className="w-40 sm:w-48 shrink-0 snap-start">
              <div className="group h-full rounded-2xl border border-white/80 bg-white/90 p-2 shadow-[0_12px_30px_-18px_rgba(244,63,94,0.55)] backdrop-blur">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="flex h-full w-full items-center justify-center text-2xl text-zinc-400" style={serif}>{item.name.charAt(0)}</div>}
                  <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">#{rank + 1}</span>
                  <div className="absolute right-2 top-2">
                    <DishLikeButton dishName={item.name} liked={likes.mine.has(item.id)} count={likes.counts[item.id] || 0}
                      busy={likes.pending === item.id} onToggle={() => likes.toggle(item.id)} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-950" style={serif}>{item.name}</p>
                    <p className="text-xs font-semibold text-zinc-700">₹{item.price}</p>
                  </div>
                  <button type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name}`}
                    className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0A3222] text-white shadow-md transition-transform active:scale-90 cursor-pointer">
                    <Plus size={15} strokeWidth={2.5} />
                    {qty > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-zinc-950">{qty}</span>}
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
