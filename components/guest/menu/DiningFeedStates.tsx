import React from 'react';

/** The grid every category (and the search results) lays its dishes in: two across on a phone, three from tablet up. */
export const DISH_GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5';

/** Shimmering stand-ins for dishes while the menu loads, in the same grid and card shape so nothing shifts when they arrive. */
export function DishSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading dishes" className={`${DISH_GRID} pt-1`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col rounded-2xl border border-zinc-200/70 bg-white p-2.5 sm:p-3.5">
          <div className="shimmer aspect-square w-full rounded-xl" style={{ animationDelay: `${i * 90}ms` }} />
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
    <div className="my-2 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <p className="mb-1 text-base text-zinc-900 sm:text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {searching ? 'No dishes match your search' : 'The menu is being prepared'}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{searching ? 'Try another word, or clear the search' : 'Please check back in a moment'}</p>
    </div>
  );
}
