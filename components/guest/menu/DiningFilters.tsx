"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { stickerFor, stickerSrc } from "@/lib/guest/menu-stickers";
import { chipPhoto } from "@/lib/guest/category-covers";

interface DiningFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  /** Dish counts keyed by lower-cased category; "dining" is every dish. */
  counts?: Record<string, number>;
  /** A dish photo for each category, keyed by lower-cased category; "dining" is the all-dishes chip. */
  covers?: Record<string, string>;
  /** Dishes matching the current search and category. */
  shownCount?: number;
}

// "Dining" is the all-dishes filter value; guests see it named for what it does.
const ALL = "Dining";
const label = (cat: string) => (cat === ALL ? "All dishes" : cat);
const key = (cat: string) => cat.trim().toLowerCase();
const fade = { maskImage: "linear-gradient(to right, black calc(100% - 28px), transparent)", WebkitMaskImage: "linear-gradient(to right, black calc(100% - 28px), transparent)" };

function SearchField({ value, onChange, shownCount, compact }: { value: string; onChange: (v: string) => void; shownCount?: number; compact?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
        <Search size={15} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search dishes, drinks, desserts"
        aria-label="Search the menu"
        className={`${compact ? "h-9" : "h-11"} w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-20 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition-shadow focus:border-emerald-800/40 focus:outline-none focus:shadow-[0_8px_24px_-14px_rgba(16,185,129,0.6)]`}
      />
      {value && (
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          <span className="text-[11px] tabular-nums text-zinc-500">{shownCount ?? 0} found</span>
          <button type="button" onClick={() => onChange("")} aria-label="Clear search"
            className="grid h-6 w-6 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A category's picture: the venue's own dish photo, small; the full photo if the small one cannot load; and the food
 * sticker when the category has no photo at all.
 */
function CoverImage({ category, cover, size, eager, className }: { category: string; cover?: string; size: number; eager: boolean; className: string }) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const src = useMemo(() => (cover ? [chipPhoto(cover), cover].find((url) => !failed.includes(url)) : undefined), [cover, failed]);
  if (!src) {
    return <Image src={stickerSrc(stickerFor(category))} alt="" width={size} height={size} unoptimized className={`${className} object-contain p-[12%]`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dish photos come from the venue's storage, already sized by chipPhoto
    <img src={src} alt="" width={size} height={size} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed((f) => [...f, src])} className={`${className} object-cover`} />
  );
}

/**
 * The category chips. "tiles" is the full rail: a round photo of one of the category's own dishes over its name,
 * the count in a corner. "pills" is the compact row in the bar that follows the guest down the page. Either way the
 * chosen chip is kept in view.
 */
function CategoryRail({ variant, categories, selectedCategory, onSelect, counts, covers }: {
  variant: "tiles" | "pills"; categories: string[]; selectedCategory: string; onSelect: (cat: string) => void;
  counts?: Record<string, number>; covers?: Record<string, string>;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const activeChip = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const box = rail.current;
    const chip = activeChip.current;
    if (!box || !chip) return;
    box.scrollTo({ left: Math.max(0, chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2), behavior: "smooth" });
  }, [selectedCategory]);

  return (
    <div
      ref={rail}
      role="group"
      aria-label="Menu categories"
      className={`relative flex overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${variant === "tiles" ? "gap-1 pt-1" : "items-center gap-1.5"}`}
      style={fade}
    >
      {categories.map((cat) => {
        const isActive = selectedCategory === cat;
        const count = counts?.[key(cat)];
        const cover = covers?.[key(cat)];
        if (variant === "pills") {
          return (
            <button
              key={cat}
              ref={isActive ? activeChip : undefined}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(cat)}
              className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-3 text-xs font-medium transition-colors active:scale-95 ${
                isActive ? "bg-[#0A3222] text-white shadow-[0_6px_16px_-8px_rgba(10,50,34,0.8)]" : "border border-zinc-200/70 bg-white text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <CoverImage category={cat} cover={cover} size={24} eager={false} className={`h-6 w-6 rounded-full bg-zinc-100 ${isActive ? "ring-1 ring-white/40" : ""}`} />
              {label(cat)}
              {count !== undefined && <span className={`tabular-nums text-[10px] ${isActive ? "text-emerald-200" : "text-zinc-400"}`}>{count}</span>}
            </button>
          );
        }
        return (
          <button
            key={cat}
            ref={isActive ? activeChip : undefined}
            type="button"
            aria-pressed={isActive}
            aria-label={count !== undefined ? `${label(cat)}, ${count} dishes` : label(cat)}
            onClick={() => onSelect(cat)}
            className="group flex w-[76px] shrink-0 cursor-pointer flex-col items-center rounded-2xl pb-1 pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40"
          >
            <span className="relative grid h-[66px] w-[66px] place-items-center">
              {/* Every chip's photo loads up front (about 9 KB each), so a swipe along the row never shows an empty circle. */}
              <CoverImage
                category={cat} cover={cover} size={60} eager
                className={`h-[60px] w-[60px] rounded-full bg-white transition-[transform,box-shadow] duration-200 ease-out ${
                  isActive
                    ? "-translate-y-0.5 shadow-[0_0_0_2px_#faf9f6,0_0_0_4px_#0A3222,0_10px_20px_-10px_rgba(10,50,34,0.7)]"
                    : "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_6px_14px_-10px_rgba(0,0,0,0.45)] group-hover:-translate-y-0.5 group-active:scale-95"
                }`}
              />
              {count !== undefined && (
                <span aria-hidden className={`absolute -right-0.5 top-0 min-w-[18px] rounded-full px-1 text-center text-[9px] font-bold leading-[16px] tabular-nums ring-2 ring-[#faf9f6] ${isActive ? "bg-[#0A3222] text-white" : "bg-white text-zinc-500 shadow-sm"}`}>{count}</span>
              )}
            </span>
            <span aria-hidden className={`mt-1 line-clamp-2 w-full text-center text-[11px] leading-tight ${isActive ? "font-semibold text-[#0A3222]" : "font-medium text-zinc-600"}`}>{label(cat)}</span>
            <span aria-hidden className={`mt-1 h-[3px] w-6 rounded-full transition-colors ${isActive ? "bg-[#0A3222]" : "bg-transparent"}`} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The menu's filter bar: search, and the categories as photos of their own dishes. Once the guest scrolls past it, a compact bar
 * (search and small chips) slides down from the top and stays, so filtering is always one tap away. The compact bar
 * floats over the page instead of resizing it, so nothing below ever jumps.
 */
export function DiningFilters({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  onSelectCategory,
  counts,
  covers,
  shownCount,
}: DiningFiltersProps) {
  const block = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const el = block.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Choosing a category from the compact bar brings the dishes up under it.
  const selectFromBar = (cat: string) => {
    onSelectCategory(cat);
    const el = block.current;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().bottom + window.scrollY - 96, behavior: "smooth" });
  };

  return (
    <>
      <div ref={block} className="space-y-2.5">
        <SearchField value={searchQuery} onChange={setSearchQuery} shownCount={shownCount} />
        <CategoryRail variant="tiles" categories={categories} selectedCategory={selectedCategory} onSelect={onSelectCategory} counts={counts} covers={covers} />
      </div>

      {/* Drawn at the end of the page (a portal), so no parent's spacing or transform can move it off the top. */}
      {mounted && createPortal(
        <div
          aria-hidden={!compact}
          inert={!compact}
          className={`fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out will-change-transform ${compact ? "translate-y-0" : "-translate-y-full"}`}
        >
          <div className="border-b border-zinc-200/70 bg-[#faf9f6]/[0.97] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)]">
            <div className="mx-auto max-w-5xl space-y-2 px-4 py-2 sm:px-6">
              <SearchField value={searchQuery} onChange={setSearchQuery} shownCount={shownCount} compact />
              <CategoryRail variant="pills" categories={categories} selectedCategory={selectedCategory} onSelect={selectFromBar} counts={counts} covers={covers} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default DiningFilters;
