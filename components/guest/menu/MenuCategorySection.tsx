'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { sectionId } from './hooks/useCategorySpy';
import { pressSoft } from './motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

interface MenuCategorySectionProps {
  title: string;
  count: number;
  /** A dish photo from this category, shown as the bar's picture. */
  image?: string | null;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * One menu category: a bar that opens to show its dishes. The bar is the section's anchor, so the filter chips can scroll to
 * it and light up as the page passes it. A closed bar keeps its dishes out of view and out of the tab order.
 */
export function MenuCategorySection({ title, count, image, open, onToggle, children }: MenuCategorySectionProps) {
  const bodyId = useId();
  return (
    <section id={sectionId(title)} data-category={title} aria-label={title}>
      <motion.button type="button" onClick={onToggle} aria-expanded={open} aria-controls={bodyId} {...pressSoft}
        className={`group flex w-full cursor-pointer items-center gap-4 rounded-[22px] border bg-[#fbf9f4] px-3.5 py-3 text-left transition-[border-color,box-shadow] duration-500 sm:px-5 sm:py-3.5 ${
          open ? 'border-[#b08d57]/55 shadow-[0_0_0_3px_rgba(217,193,147,0.16),0_18px_36px_-28px_rgba(16,35,26,0.55)]' : 'border-[#e8dfcc] shadow-[0_14px_30px_-28px_rgba(16,35,26,0.5)] hover:border-[#d9c193]'
        }`}>
        <span className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-xl shadow-[0_0_0_2px_#fbf9f4,0_0_0_3px_rgba(176,141,87,0.45)] ${image ? '' : 'bg-[#efe7d6] text-[#8a6d3f]'}`} style={image ? undefined : LUXE_SERIF}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small venue photo, already sized
            <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : title.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.35rem] font-medium leading-tight text-[#10231a] sm:text-[1.5rem]" style={LUXE_SERIF}>{title}</span>
          <span className="mt-0.5 block text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">{count} {count === 1 ? 'dish' : 'dishes'}</span>
        </span>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-[transform,border-color,background-color] duration-500 ${open ? 'rotate-180 border-[#0f2a1e] bg-[#0f2a1e] text-[#d9c193]' : 'border-[#d9c193] text-[#8a6d3f] group-hover:border-[#b08d57]'}`}>
          <ChevronDown size={16} />
        </span>
      </motion.button>

      <div id={bodyId} inert={!open} className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}>
        <div className="min-h-0 overflow-hidden">
          <div className={`pb-1 pt-4 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : '-translate-y-2'}`}>{children}</div>
        </div>
      </div>
    </section>
  );
}

export default MenuCategorySection;
