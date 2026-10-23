import React from 'react';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

/** The grid every category (and the search results) lays its dishes in: two across on a phone, three from tablet up. */
export const DISH_GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5';

/** Shimmering stand-ins for dishes while the menu loads, in the same grid and card shape so nothing shifts when they arrive. */
export function DishSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading dishes" className={`${DISH_GRID} pt-1`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col rounded-[24px] border border-[#e8dfcc] bg-[#fbf9f4] p-2 sm:p-3">
          <div className="shimmer aspect-square w-full rounded-[18px]" style={{ animationDelay: `${i * 90}ms` }} />
          <div className="mt-2.5 space-y-2 px-0.5 pb-1">
            <div className="shimmer h-4 w-3/4 rounded" style={{ animationDelay: `${i * 90}ms` }} />
            <div className="shimmer h-3 w-1/2 rounded" style={{ animationDelay: `${i * 90}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Nothing matches: say so, and what to do about it. */
export function NoDishes({ searching }: { searching: boolean }) {
  return (
    <div className="my-2 rounded-[24px] border border-dashed border-[#d9c193] bg-[#fbf9f4] px-6 py-14 text-center">
      <p className="mb-1 text-[1.4rem] text-[#10231a]" style={LUXE_SERIF}>
        {searching ? 'No dishes match your search' : 'The menu is being prepared'}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3f]">{searching ? 'Try another word, or clear the search' : 'Please check back in a moment'}</p>
    </div>
  );
}
