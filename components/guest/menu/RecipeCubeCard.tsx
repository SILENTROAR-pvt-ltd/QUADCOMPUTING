'use client';

import React from 'react';
import { MenuItem } from './types';
import { DishLikeButton } from './DishLikeButton';
import { DishImage } from './DishImage';
import { DishAddControl } from './DishAddControl';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { dishMark } from '@/lib/guest/dish-mark';
import { VegMark } from './cards/VegMark';

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

/**
 * A dish tile: a square photo with a fine ivory border, the dish in the house serif, its price, and an add control.
 * A dish in the tray wears a gold ring.
 */
function RecipeCubeCardBase({ item, cartQuantity, onIncrement, onDecrement, likes, priority }: RecipeCubeCardProps) {
  const hasOptions = Boolean(item.item_options?.length || item.options?.length || item.customization_groups?.length);
  const price = item.price ?? (item as any).base_price ?? 0;
  const mark = dishMark(item);

  return (
    <div
      onClick={() => onIncrement(item)}
      className={`group relative flex cursor-pointer select-none flex-col rounded-[24px] border bg-[#fbf9f4] p-2 transition-[transform,box-shadow,border-color] duration-500 active:scale-[0.985] sm:p-3 hover:-translate-y-1 ${
        cartQuantity > 0
          ? 'border-[#b08d57]/70 shadow-[0_0_0_3px_rgba(217,193,147,0.22),0_22px_40px_-28px_rgba(15,42,30,0.6)]'
          : 'border-[#e8dfcc] shadow-[0_18px_36px_-30px_rgba(16,35,26,0.55)] hover:shadow-[0_26px_44px_-30px_rgba(16,35,26,0.6)]'
      }`}
    >
      <div className="relative isolate aspect-square w-full overflow-hidden rounded-[18px] bg-[#efe7d6] ring-1 ring-[#e8dfcc]">
        <DishImage src={item.image_url} name={item.name} priority={priority} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
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

      <div className="mt-2.5 flex flex-1 flex-col justify-between px-1">
        <div>
          <h3 className="line-clamp-1 text-[1.2rem] font-semibold leading-tight text-[#10231a] sm:text-[1.35rem]" style={LUXE_SERIF}>{item.name}</h3>
          {item.description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#10231a]/55 sm:text-xs">{item.description}</p>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-[#e8dfcc] pt-2">
          <span className="text-[14px] font-semibold tabular-nums tracking-tight text-[#0f2a1e]">₹{price}</span>
          <span className="flex items-center gap-1.5">
            {hasOptions && <span className="rounded-full border border-[#d9c193] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#8a6d3f]">Options</span>}
            {mark && <VegMark mark={mark} />}
          </span>
        </div>
      </div>
    </div>
  );
}

// A tap on one dish re-renders only that dish, not the whole menu.
export const RecipeCubeCard = React.memo(RecipeCubeCardBase);

export default RecipeCubeCard;
