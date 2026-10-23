"use client";

import React from "react";
import { motion } from "framer-motion";
import { press } from "../motion";
import { CoverImage } from "./CoverImage";

interface CategoryChipProps {
  category: string;
  label: string;
  active: boolean;
  count?: number;
  cover?: string;
  onSelect: (category: string) => void;
}

/** One category: a round photo of one of its own dishes over its name, the count in a corner. It springs under a tap. */
function CategoryChipBase({ category, label, active, count, cover, onSelect }: CategoryChipProps) {
  return (
    <motion.button
      type="button"
      data-chip={category}
      aria-pressed={active}
      aria-label={count !== undefined ? `${label}, ${count} dishes` : label}
      onClick={() => onSelect(category)}
      {...press}
      className="group flex w-[76px] shrink-0 cursor-pointer flex-col items-center rounded-2xl pb-1 pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b08d57]/50"
    >
      <span className="relative grid h-[66px] w-[66px] place-items-center">
        {/* Every chip's photo loads up front (about 9 KB each), so a swipe along the row never shows an empty circle. */}
        <CoverImage category={category} cover={cover} size={60} eager
          className={`h-[60px] w-[60px] rounded-full bg-[#fbf9f4] transition-[transform,box-shadow] duration-300 ease-out ${
            active ? "-translate-y-1 shadow-[0_0_0_2px_#f5f1e8,0_0_0_3.5px_#b08d57,0_14px_24px_-12px_rgba(15,42,30,0.65)]" : "shadow-[0_0_0_1px_rgba(176,141,87,0.28),0_6px_14px_-10px_rgba(16,35,26,0.45)]"
          }`} />
        {count !== undefined && (
          <span aria-hidden className={`absolute -right-0.5 top-0 min-w-[18px] rounded-full px-1 text-center text-[9px] font-bold leading-[16px] tabular-nums ring-2 ring-[#f5f1e8] ${active ? "bg-[#0f2a1e] text-[#d9c193]" : "bg-[#fbf9f4] text-[#10231a]/55 shadow-sm"}`}>{count}</span>
        )}
      </span>
      <span aria-hidden className={`mt-1 line-clamp-2 w-full text-center text-[11px] leading-tight transition-colors ${active ? "font-semibold text-[#0f2a1e]" : "font-medium text-[#10231a]/60"}`}>{label}</span>
      <span aria-hidden className={`mt-1 h-[2px] rounded-full bg-[#b08d57] transition-[width,opacity] duration-300 ${active ? "w-6 opacity-100" : "w-2 opacity-0"}`} />
    </motion.button>
  );
}

export const CategoryChip = React.memo(CategoryChipBase);
