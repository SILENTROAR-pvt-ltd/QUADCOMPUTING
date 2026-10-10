'use client';

import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface MenuCategorySectionProps {
  title: string;
  count: number;
  /** A dish photo from this category, shown as the bar's picture. */
  image?: string | null;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/**
 * One menu category: a rectangular bar that opens to reveal its dishes. The gold glow sits on the
 * bar's border only. Closed categories keep their dishes mounted but out of view and out of the tab order.
 */
export function MenuCategorySection({ title, count, image, open, onToggle, children }: MenuCategorySectionProps) {
  const bodyId = useId();
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl border bg-white px-4 py-3 text-left transition-all duration-500 sm:px-5 sm:py-3.5 active:scale-[0.99] ${
          // The glow stays on the bar's own border: no spread, so it cannot bleed onto the dishes below.
          open
            ? 'border-[#EEDDB4] shadow-[0_0_0_1px_rgba(238,221,180,0.6)]'
            : 'border-zinc-200/80 shadow-xs hover:border-[#F2E6C6]'
        }`}
      >
        <span className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl text-xl ring-1 ring-zinc-200 ${image ? '' : 'bg-zinc-100 text-zinc-700'}`} style={image ? undefined : serif}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            title.charAt(0)
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg text-zinc-950 sm:text-xl" style={serif}>{title}</span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {count} {count === 1 ? 'dish' : 'dishes'}
          </span>
        </span>

        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-500 ${open ? 'rotate-180 border-[#C8A96A] text-zinc-900' : 'border-zinc-200 text-zinc-500 group-hover:text-zinc-900'}`}>
          <ChevronDown size={16} />
        </span>
      </button>

      <div
        id={bodyId}
        inert={!open}
        className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`pt-4 pb-1 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : '-translate-y-2'}`}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MenuCategorySection;
