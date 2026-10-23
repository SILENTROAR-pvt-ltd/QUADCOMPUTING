"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { press } from "../motion";

interface SearchFieldProps {
  value: string;
  onChange: (v: string) => void;
  shownCount?: number;
}

/** The menu search box. The "found" count and the clear button slide in once there is something typed. */
export function SearchField({ value, onChange, shownCount }: SearchFieldProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#8a6d3f]"><Search size={15} /></span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search dishes, drinks, desserts"
        aria-label="Search the menu"
        className="h-12 w-full rounded-full border border-[#e8dfcc] bg-[#fbf9f4] pl-11 pr-24 text-[16px] text-[#10231a] shadow-[0_12px_26px_-22px_rgba(16,35,26,0.6)] transition-shadow placeholder:text-[#10231a]/40 focus:border-[#b08d57]/70 focus:outline-none focus:shadow-[0_0_0_4px_rgba(217,193,147,0.2)] sm:text-sm"
      />
      <AnimatePresence>
        {value && (
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
            className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
            <span className="text-[11px] tabular-nums text-[#8a6d3f]">{shownCount ?? 0} found</span>
            <motion.button type="button" onClick={() => onChange("")} aria-label="Clear search" {...press}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#10231a]/50 hover:bg-[#efe7d6] hover:text-[#10231a]">
              <X size={14} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
