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
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400"><Search size={15} /></span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search dishes, drinks, desserts"
        aria-label="Search the menu"
        className="h-11 w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-24 text-[16px] text-zinc-900 shadow-xs transition-shadow placeholder:text-zinc-400 focus:border-emerald-800/40 focus:outline-none focus:shadow-[0_8px_24px_-14px_rgba(16,185,129,0.6)] sm:text-sm"
      />
      <AnimatePresence>
        {value && (
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
            className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
            <span className="text-[11px] tabular-nums text-zinc-500">{shownCount ?? 0} found</span>
            <motion.button type="button" onClick={() => onChange("")} aria-label="Clear search" {...press}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
              <X size={14} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
