'use client';

import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { MenuItem } from './types';
import { DishLikeButton } from './DishLikeButton';

/** Dish likes as the feed needs them. Absent (or not yet available) means no hearts are shown. */
export interface DishLikesView {
  counts: Record<string, number>;
  mine: Set<string>;
  pending: string | null;
  toggle: (itemId: string) => void;
}

interface RecipeCubeCardProps {
  item: MenuItem;
  cartQuantity: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
  likes?: DishLikesView;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** A dish tile: a square photo, the dish, its price, and an add control. */
export function RecipeCubeCard({ item, cartQuantity, onIncrement, onDecrement, likes }: RecipeCubeCardProps) {
  const hasOptions =
    (item.item_options && item.item_options.length > 0) ||
    (item.options && item.options.length > 0) ||
    (item.customization_groups && item.customization_groups.length > 0);
  const itemPrice = item.price ?? (item as any).base_price ?? 0;
  const inTray = cartQuantity > 0;

  return (
    <div
      onClick={() => onIncrement(item)}
      className={`group relative flex flex-col rounded-2xl border bg-white p-2.5 sm:p-3.5 transition-all duration-300 cursor-pointer select-none hover:-translate-y-0.5 hover:shadow-md ${
        inTray ? 'border-zinc-400 shadow-md' : 'border-zinc-200/80 shadow-xs'
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            src={item.image_url}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-400" style={serif} aria-hidden>
            {item.name.charAt(0)}
          </div>
        )}

        {likes && (
          <div className="absolute left-2 top-2 z-10">
            <DishLikeButton
              dishName={item.name}
              liked={likes.mine.has(item.id)}
              count={likes.counts[item.id] || 0}
              busy={likes.pending === item.id}
              onToggle={() => likes.toggle(item.id)}
            />
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-10">
          {!inTray ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onIncrement(item); }}
              className="grid h-9 w-9 place-items-center rounded-full bg-black text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-90 cursor-pointer"
              aria-label={`Add ${item.name}`}
            >
              <Plus size={17} strokeWidth={2.5} />
            </button>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full bg-[#F4E7C5] px-2 py-1 text-[#3B2C12] shadow-sm animate-in fade-in zoom-in-95"
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDecrement(item); }}
                className={`grid h-6 w-6 place-items-center rounded-full transition-all hover:bg-[#E6CF95] active:scale-90 cursor-pointer ${cartQuantity === 1 ? 'text-rose-700' : ''}`}
                aria-label={cartQuantity === 1 ? 'Remove from Cart' : 'Decrease Quantity'}
              >
                {cartQuantity === 1 ? <Trash2 size={13} strokeWidth={2.5} /> : <Minus size={13} strokeWidth={2.5} />}
              </button>
              <span className="min-w-[16px] px-0.5 text-center font-sans text-xs font-bold tabular-nums">{cartQuantity}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onIncrement(item); }}
                className="grid h-6 w-6 place-items-center rounded-full transition-all hover:bg-[#E6CF95] active:scale-90 cursor-pointer"
                aria-label="Increase Quantity"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-1 flex-col justify-between">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-zinc-900 sm:text-lg" style={serif}>
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-light leading-snug text-zinc-500 sm:text-xs">{item.description}</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
          <span className="font-sans text-sm font-semibold tracking-tight text-zinc-900">₹{itemPrice}</span>
          {hasOptions && (
            <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500">
              Options
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeCubeCard;
