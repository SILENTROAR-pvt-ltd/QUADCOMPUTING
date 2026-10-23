"use client";

import { motion } from "framer-motion";
import { VegMark } from "../cards/VegMark";
import { press } from "../motion";
import { DIET_LABEL, type DietChoice, type DietFilter } from "@/lib/guest/diet-filter";

interface DietFilterBarProps {
  /** The diets this menu can be narrowed to, with their dish counts (see dietChoices). */
  choices: { diet: DietChoice; count: number }[];
  total: number;
  value: DietFilter;
  onChange: (next: DietFilter) => void;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button type="button" aria-pressed={on} onClick={onClick} {...press}
      className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors ${
        on ? "border-[#0f2a1e] bg-[#0f2a1e] text-[#f5f1e8] shadow-[0_10px_20px_-14px_rgba(15,42,30,0.9)]" : "border-[#e8dfcc] bg-[#fbf9f4] text-[#10231a] hover:border-[#b08d57]/60"
      }`}>
      {children}
    </motion.button>
  );
}

/**
 * Diet chips under the search: All, then Veg, Vegan, Egg and Non-veg as far as this menu has them. One at a time; tapping
 * the chosen chip again shows everything. Nothing is shown when the menu is all one diet (there is nothing to narrow).
 */
export function DietFilterBar({ choices, total, value, onChange }: DietFilterBarProps) {
  if (choices.length === 0) return null;
  const count = (n: number, on: boolean) => <span className={`text-[11px] tabular-nums ${on ? "text-[#d9c193]" : "text-[#8a6d3f]"}`}>{n}</span>;
  return (
    <div role="group" aria-label="Filter by diet" className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip on={value === "all"} onClick={() => onChange("all")}>All {count(total, value === "all")}</Chip>
      {choices.map(({ diet, count: n }) => {
        const on = value === diet;
        return (
          <Chip key={diet} on={on} onClick={() => onChange(on ? "all" : diet)}>
            <VegMark mark={diet} />
            {DIET_LABEL[diet]} {count(n, on)}
          </Chip>
        );
      })}
    </div>
  );
}
