import React from 'react';
import { dishMark, type DishMark } from '@/lib/guest/dish-mark';
import type { MenuItem } from '../types';

type Mark = DishMark | 'vegan';

// Indian menu colours, deepened for an ivory card: green for veg and vegan, maroon-red for non-veg, warm yolk yellow for egg.
const TONE: Record<Mark, { ink: string; fill: string; label: string }> = {
  veg: { ink: '#16794a', fill: '#1d8f57', label: 'Vegetarian' },
  vegan: { ink: '#16794a', fill: '#1d8f57', label: 'Vegan' },
  non_veg: { ink: '#a8322a', fill: '#b83a30', label: 'Non-vegetarian' },
  egg: { ink: '#c98a06', fill: '#f2b51d', label: 'Contains egg' },
};

/** The symbol inside the square, drawn on an 18-unit grid and centred by eye (a triangle sits a touch high to look level). */
function Glyph({ mark, fill, ink }: { mark: Mark; fill: string; ink: string }) {
  if (mark === 'veg') return <circle cx="9" cy="9" r="3.6" fill={fill} />;
  if (mark === 'non_veg') {
    return <path d="M9 5.1 12.7 11.9H5.3Z" fill={fill} stroke={fill} strokeWidth="1.1" strokeLinejoin="round" />;
  }
  if (mark === 'egg') {
    // An egg: narrower at the top, with a soft highlight.
    return (
      <>
        <path d="M9 4.9c1.9 0 3.3 2.5 3.3 4.7A3.3 3.3 0 0 1 5.7 9.6C5.7 7.4 7.1 4.9 9 4.9Z" fill={fill} stroke={ink} strokeWidth="0.7" />
        <ellipse cx="7.8" cy="8" rx="0.75" ry="1.1" fill="#fff6d6" opacity="0.85" />
      </>
    );
  }
  return (
    <>
      <path d="M5.4 12.6C5.2 8.6 7.8 5.6 12.6 5.4c-.2 4.8-3.1 7.4-7.2 7.2Z" fill={fill} />
      <path d="M5.9 12.1 10.3 7.7" stroke="#fffdf8" strokeWidth="0.8" strokeLinecap="round" />
    </>
  );
}

/**
 * The Indian menu mark, drawn finely: a dot for veg, a triangle for non-veg, an egg for egg and a leaf for vegan, each
 * in its colour inside a matching square. It sits on an ivory coin so it reads as part of the card rather than a sticker.
 * Drawn as one SVG so every size (15 px in the rails, 18 px on the cards) stays crisp and centred.
 */
export function VegMark({ mark, className = '' }: { mark: Mark; className?: string }) {
  const t = TONE[mark];
  return (
    <span role="img" aria-label={t.label} title={t.label}
      className={`inline-block h-[18px] w-[18px] shrink-0 align-middle drop-shadow-[0_1px_1.5px_rgba(16,35,26,0.14)] ${className}`}>
      <svg viewBox="0 0 18 18" className="block h-full w-full" aria-hidden>
        <rect x="1.1" y="1.1" width="15.8" height="15.8" rx="4" fill="#fffdf8" stroke={t.ink} strokeWidth="1.5" />
        <Glyph mark={mark} fill={t.fill} ink={t.ink} />
      </svg>
    </span>
  );
}

/** The mark for a menu item, or nothing when the item has none (see dishMark). */
export function ItemVegMark({ item, className }: { item: MenuItem; className?: string }) {
  const mark = dishMark(item);
  return mark ? <VegMark mark={mark} className={className} /> : null;
}
