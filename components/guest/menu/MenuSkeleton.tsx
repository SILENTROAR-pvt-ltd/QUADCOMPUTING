/**
 * What a guest sees while the menu loads: the page's own shape (header, account bar, search, category chips, dishes) in
 * shimmering placeholder blocks, on the menu's ivory background, so the first moment never flashes dark or empty.
 */
export function MenuSkeleton() {
  const card = 'rounded-2xl bg-white ring-1 ring-zinc-200/70';
  return (
    <div role="status" aria-label="Loading the menu" className="min-h-[100dvh] w-full bg-[#faf9f6]">
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <span className="shimmer h-6 w-24 rounded-full" />
          <span className="shimmer h-2.5 w-28 rounded" />
          <span className="h-6 w-16" />
        </div>
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <span className="shimmer h-3 w-40 rounded-xl" />
          <span className="shimmer h-8 w-56 rounded-xl" />
          <span className="shimmer h-3 w-64 rounded-xl" />
        </div>
        <div className="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <span key={i} className={`shimmer h-[74px] ${card}`} />)}
        </div>
        <span className="shimmer mt-4 block h-16 rounded-2xl" />
        <span className="shimmer mt-4 block h-11 rounded-xl" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="flex w-[70px] shrink-0 flex-col items-center gap-2">
              <span className="shimmer h-[52px] w-[52px] rounded-full" style={{ animationDelay: `${i * 80}ms` }} />
              <span className="shimmer h-2.5 w-12 rounded" style={{ animationDelay: `${i * 80}ms` }} />
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 4 }, (_, i) => <span key={i} className="shimmer aspect-[4/5] rounded-2xl" style={{ animationDelay: `${i * 90}ms` }} />)}
        </div>
      </div>
    </div>
  );
}

export default MenuSkeleton;
