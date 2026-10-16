"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SPRING } from "../motion";

const rupees = (n: number) => `₹${Number(n || 0).toFixed(2).replace(/\.00$/, "")}`;

interface WalletSwitchProps {
  on: boolean;
  busy: boolean;
  balance: number;
  /** What will go towards this bill: never more than is owed. */
  amount: number;
  onToggle: () => void;
}

/** "Use my wallet balance": a switch whose knob slides on a spring. */
export function WalletSwitch({ on, busy, balance, amount, onToggle }: WalletSwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} disabled={busy}
      className={`mt-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${on ? "border-emerald-700/40 bg-emerald-50" : "border-neutral-200 bg-white"}`}>
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Sparkles className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-zinc-950">Use my wallet balance</span>
        <span className="block text-[12px] leading-snug text-zinc-500">You have {rupees(balance)} in cashback. {rupees(amount)} will go towards this bill.</span>
      </span>
      <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-700" : "bg-neutral-300"}`}>
        <motion.span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" animate={{ x: on ? 20 : 0 }} transition={SPRING} />
      </span>
    </button>
  );
}
