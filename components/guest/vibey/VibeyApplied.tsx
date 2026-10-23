'use client';

import React from 'react';
import { Check, Undo2 } from 'lucide-react';

interface VibeyAppliedProps {
  lines: string[];
  undone?: boolean;
  onUndo: () => void;
}

/** The receipt for what Vibey just put in the tray: an ivory slip with a gold hairline, one line per dish, and Undo. */
export function VibeyApplied({ lines, undone, onUndo }: VibeyAppliedProps) {
  return (
    <div className={`rounded-2xl border px-3.5 py-3 text-[13px] ${undone
      ? 'border-[#e8dfcc] bg-[#f5f1e8] text-[#a59a83]'
      : 'border-[#d9c193]/70 bg-gradient-to-br from-[#fbf7ec] to-[#f4ecda] text-[#10231a] shadow-[0_12px_26px_-22px_rgba(138,109,63,0.7)]'}`}>
      <p className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#8a6d3f]">
        <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full ${undone ? 'bg-[#e8dfcc] text-[#a59a83]' : 'bg-[#0f2a1e] text-[#e6cf9c]'}`}>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        {undone ? 'Undone' : 'In your tray'}
      </p>
      <ul className={`space-y-0.5 pl-7 leading-snug ${undone ? 'line-through' : ''}`}>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      {!undone && (
        <button type="button" onClick={onUndo}
          className="ml-5 mt-1.5 inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[12.5px] font-semibold text-[#8a6d3f] transition-colors hover:bg-[#efe7d6]">
          <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
        </button>
      )}
    </div>
  );
}
