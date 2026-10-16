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
      className="group flex w-[76px] shrink-0 cursor-pointer flex-col items-center rounded-2xl pb-1 pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40"
    >
      <span className="relative grid h-[66px] w-[66px] place-items-center">
        {/* Every chip's photo loads up front (about 9 KB each), so a swipe along the row never shows an empty circle. */}
        <CoverImage category={category} cover={cover} size={60} eager
          className={`h-[60px] w-[60px] rounded-full bg-white transition-[transform,box-shadow] duration-200 ease-out ${
            active ? "-translate-y-0.5 shadow-[0_0_0_2px_#faf9f6,0_0_0_4px_#0A3222,0_10px_20px_-10px_rgba(10,50,34,0.7)]" : "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_6px_14px_-10px_rgba(0,0,0,0.45)]"
          }`} />
        {count !== undefined && (
          <span aria-hidden className={`absolute -right-0.5 top-0 min-w-[18px] rounded-full px-1 text-center text-[9px] font-bold leading-[16px] tabular-nums ring-2 ring-[#faf9f6] ${active ? "bg-[#0A3222] text-white" : "bg-white text-zinc-500 shadow-sm"}`}>{count}</span>
        )}
      </span>
      <span aria-hidden className={`mt-1 line-clamp-2 w-full text-center text-[11px] leading-tight transition-colors ${active ? "font-semibold text-[#0A3222]" : "font-medium text-zinc-600"}`}>{label}</span>
      <span aria-hidden className={`mt-1 h-[3px] rounded-full bg-[#0A3222] transition-[width,opacity] duration-300 ${active ? "w-6 opacity-100" : "w-2 opacity-0"}`} />
    </motion.button>
  );
}

export const CategoryChip = React.memo(CategoryChipBase);
