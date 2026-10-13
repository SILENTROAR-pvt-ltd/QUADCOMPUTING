/**
 * What a guest sees while the menu loads: the page's own shape (header, account bar, search, category stickers,
 * dishes) in soft placeholder blocks, on the menu's ivory background, so the first moment never flashes dark.
 */
export function MenuSkeleton() {
  const block = 'rounded-xl bg-zinc-200/60';
  return (
    <div role="status" aria-label="Loading the menu" className="min-h-[100dvh] w-full bg-[#faf9f6]">
      <div className="mx-auto max-w-5xl animate-pulse px-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <span className="h-6 w-24 rounded-full bg-zinc-300/70" />
          <span className="h-2.5 w-28 rounded bg-zinc-200/70" />
          <span className="h-6 w-16" />
        </div>
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <span className={`h-3 w-40 ${block}`} />
          <span className={`h-8 w-56 ${block}`} />
          <span className={`h-3 w-64 ${block}`} />
          <span className="mt-1 h-5 w-48 rounded-full bg-amber-100/80" />
        </div>
        <div className="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <span key={i} className="h-[74px] rounded-2xl bg-white ring-1 ring-zinc-200/70" />)}
        </div>
        <span className="mt-4 block h-16 rounded-2xl bg-white ring-1 ring-zinc-200/70" />
        <span className="mt-4 block h-11 rounded-xl bg-white ring-1 ring-zinc-200/70" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="flex w-[70px] shrink-0 flex-col items-center gap-2">
              <span className="h-[52px] w-[52px] rounded-full bg-zinc-200/70" />
              <span className="h-2.5 w-12 rounded bg-zinc-200/70" />
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 4 }, (_, i) => <span key={i} className="aspect-[4/5] rounded-2xl bg-white ring-1 ring-zinc-200/70" />)}
        </div>
      </div>
    </div>
  );
}

export default MenuSkeleton;
