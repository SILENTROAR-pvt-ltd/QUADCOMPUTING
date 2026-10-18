"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { press } from "../menu/motion";

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

interface SheetHeaderProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  onClose: () => void;
  disabled?: boolean;
  /** Extra buttons shown before the close button. */
  extra?: React.ReactNode;
}

/** A sheet's top row: a round dark icon, the serif title with a quiet line beneath, and a close button. */
export function SheetHeader({ id, icon, title, subtitle, onClose, disabled, extra }: SheetHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">{icon}</span>
        <div>
          <h2 id={id} className="text-[22px] leading-tight text-zinc-950" style={SERIF}>{title}</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        {extra}
        <motion.button type="button" onClick={onClose} disabled={disabled} aria-label="Close" {...press}
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-zinc-500 hover:bg-black/5 disabled:opacity-40">
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
