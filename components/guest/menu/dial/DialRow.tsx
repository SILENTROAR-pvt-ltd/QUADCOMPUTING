"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, ConciergeBell, Radar, Receipt, Sparkles, User, Users } from "lucide-react";
import { press } from "../motion";
import type { DialAction } from "../QuickActionsDial";

const ICON: Record<DialAction["id"], React.ComponentType<{ className?: string }>> = {
  profile: User,
  service: ConciergeBell,
  tracker: Radar,
  bill: Receipt,
  services: Sparkles,
  lounge: Users,
};

/** One entry of the open list: a label pill, and a round icon in the same 56px column as the main button. */
export function DialRow({ action, onPick }: { action: DialAction; onPick: () => void }) {
  const Icon = action.done ? Check : ICON[action.id];
  return (
    <motion.li variants={{ hidden: { opacity: 0, y: 10, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }} transition={{ duration: 0.16 }}>
      <motion.button type="button" role="menuitem" disabled={action.done} onClick={onPick} {...press}
        className="group flex cursor-pointer items-center gap-2.5 disabled:cursor-default">
        <span className="whitespace-nowrap rounded-full bg-white px-3.5 py-2.5 font-sans text-[13px] font-semibold text-zinc-900 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] ring-1 ring-zinc-200">
          {action.label}
        </span>
        <span className="grid w-14 shrink-0 place-items-center">
          <span aria-hidden className={`grid h-11 w-11 place-items-center rounded-full shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)] ring-1 ${action.done ? "bg-emerald-600 text-white ring-emerald-500" : "bg-white text-zinc-900 ring-zinc-200"}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </span>
      </motion.button>
    </motion.li>
  );
}
