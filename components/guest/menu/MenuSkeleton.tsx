/**
 * What a guest sees while the menu loads: the page's own shape (the banner, the journey, search, category chips, dishes)
 * in shimmering placeholder blocks on the menu's ivory, so the first moment never flashes white or empty.
 */
export function MenuSkeleton() {
  const card = 'rounded-[20px] bg-[#fbf9f4] ring-1 ring-[#e8dfcc]';
  return (
    <div role="status" aria-label="Loading the menu" className="min-h-[100dvh] w-full bg-[#f5f1e8]">
      <div className="relative h-[340px] overflow-hidden rounded-b-[30px] bg-gradient-to-b from-[#173a2a] to-[#0f2a1e] sm:h-[420px]">
        <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-3">
          <span className="h-2.5 w-36 rounded-full bg-[#d9c193]/30" />
          <span className="h-9 w-56 rounded-xl bg-[#f5f1e8]/15" />
          <span className="h-3 w-44 rounded-full bg-[#f5f1e8]/10" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto mt-4 grid max-w-xl grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <span key={i} className={`shimmer h-[74px] ${card}`} />)}
        </div>
        <span className="shimmer mt-4 block h-12 rounded-full" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="flex w-[70px] shrink-0 flex-col items-center gap-2">
              <span className="shimmer h-[56px] w-[56px] rounded-full" style={{ animationDelay: `${i * 80}ms` }} />
              <span className="shimmer h-2.5 w-12 rounded" style={{ animationDelay: `${i * 80}ms` }} />
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 4 }, (_, i) => <span key={i} className="shimmer aspect-[4/5] rounded-[24px]" style={{ animationDelay: `${i * 90}ms` }} />)}
        </div>
      </div>
    </div>
  );
}

export default MenuSkeleton;
