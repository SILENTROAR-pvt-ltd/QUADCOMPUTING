'use client';

import React from 'react';
import { MenuItem } from './types';
import { DishLikeButton } from './DishLikeButton';
import { DishImage } from './DishImage';
import { DishAddControl } from './DishAddControl';

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
  /** The first dishes on screen load their photos at once; the rest wait until they are near. */
  priority?: boolean;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** A dish tile: a square photo, the dish, its price, and an add control. */
function RecipeCubeCardBase({ item, cartQuantity, onIncrement, onDecrement, likes, priority }: RecipeCubeCardProps) {
  const hasOptions = Boolean(item.item_options?.length || item.options?.length || item.customization_groups?.length);
  const price = item.price ?? (item as any).base_price ?? 0;

  return (
    <div
      onClick={() => onIncrement(item)}
      className={`group relative flex cursor-pointer select-none flex-col rounded-2xl border bg-white p-2.5 transition-[transform,box-shadow,border-color] duration-300 active:scale-[0.985] sm:p-3.5 hover:-translate-y-0.5 hover:shadow-md ${
        cartQuantity > 0 ? 'border-zinc-400 shadow-md' : 'border-zinc-200/80 shadow-xs'
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
        <DishImage src={item.image_url} name={item.name} priority={priority} />
        {likes && (
          <div className="absolute left-2 top-2 z-10">
            <DishLikeButton dishName={item.name} liked={likes.mine.has(item.id)} count={likes.counts[item.id] || 0}
              busy={likes.pending === item.id} onToggle={() => likes.toggle(item.id)} />
          </div>
        )}
        <div className="absolute bottom-2 right-2 z-10">
          <DishAddControl name={item.name} quantity={cartQuantity} onIncrement={() => onIncrement(item)} onDecrement={() => onDecrement(item)} />
        </div>
      </div>

      <div className="mt-2.5 flex flex-1 flex-col justify-between">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-zinc-900 sm:text-lg" style={SERIF}>{item.name}</h3>
          {item.description && <p className="mt-0.5 line-clamp-2 text-[11px] font-light leading-snug text-zinc-500 sm:text-xs">{item.description}</p>}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
          <span className="font-sans text-sm font-semibold tracking-tight text-zinc-900">₹{price}</span>
          {hasOptions && <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500">Options</span>}
        </div>
      </div>
    </div>
  );
}

// A tap on one dish re-renders only that dish, not the whole menu.
export const RecipeCubeCard = React.memo(RecipeCubeCardBase);

export default RecipeCubeCard;
