"use client";

import { useEffect, useRef } from "react";
import { CategoryChip } from "./CategoryChip";

interface CategoryRailProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
  /** Dish counts keyed by lower-cased category; "dining" is every dish. */
  counts?: Record<string, number>;
  /** A dish photo for each category, keyed by lower-cased category. */
  covers?: Record<string, string>;
}

// "Dining" is the all-dishes value; guests see it named for what it does.
const ALL = "Dining";
const label = (cat: string) => (cat === ALL ? "All dishes" : cat);
const key = (cat: string) => cat.trim().toLowerCase();
const FADE = "linear-gradient(to right, black calc(100% - 28px), transparent)";

/** The category chips in one swipeable row. The chosen chip glides to the centre whenever it changes (scrolling or tapping). */
export function CategoryRail({ categories, selectedCategory, onSelect, counts, covers }: CategoryRailProps) {
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = rail.current;
    const chip = Array.from(box?.querySelectorAll<HTMLElement>("[data-chip]") ?? []).find((el) => el.dataset.chip === selectedCategory);
    if (!box || !chip) return;
    const left = Math.max(0, chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2);
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ left, behavior: calm ? "auto" : "smooth" });
  }, [selectedCategory]);

  return (
    <div
      ref={rail}
      role="group"
      aria-label="Menu categories"
      className="relative flex gap-1 overflow-x-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ maskImage: FADE, WebkitMaskImage: FADE }}
    >
      {categories.map((cat) => (
        <CategoryChip key={cat} category={cat} label={label(cat)} active={selectedCategory === cat}
          count={counts?.[key(cat)]} cover={covers?.[key(cat)]} onSelect={onSelect} />
      ))}
    </div>
  );
}
