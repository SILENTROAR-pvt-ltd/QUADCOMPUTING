import React from 'react';
import { dishMark, type DishMark } from '@/lib/guest/dish-mark';
import type { MenuItem } from '../types';

const TONE: Record<DishMark, { ring: string; fill: string; label: string }> = {
  veg: { ring: 'border-[#1f8a4c]', fill: 'bg-[#1f8a4c]', label: 'Vegetarian' },
  non_veg: { ring: 'border-[#c0392b]', fill: 'border-b-[#c0392b]', label: 'Non-vegetarian' },
  egg: { ring: 'border-[#c0392b]', fill: 'border-b-[#c0392b]', label: 'Contains egg' },
};

/**
 * The Indian menu mark, drawn finely: a green square with a dot for veg, a red square with a triangle for non-veg and
 * egg. It sits on an ivory coin so it reads as part of the card rather than a sticker.
 */
export function VegMark({ mark, className = '' }: { mark: DishMark; className?: string }) {
  const t = TONE[mark];
  return (
    <span role="img" aria-label={t.label} title={t.label}
      className={`inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] bg-[#fffdf8] ${t.ring} ${className}`}>
      {mark === 'veg'
        ? <span className={`h-[8px] w-[8px] rounded-full ${t.fill}`} />
        : <span className={`h-0 w-0 border-x-[4.5px] border-b-[8px] border-x-transparent ${t.fill}`} />}
    </span>
  );
}

/** The mark for a menu item, or nothing when the item has none (see dishMark). */
export function ItemVegMark({ item, className }: { item: MenuItem; className?: string }) {
  const mark = dishMark(item);
  return mark ? <VegMark mark={mark} className={className} /> : null;
}
