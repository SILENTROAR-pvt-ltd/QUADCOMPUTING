'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

/** Opens the co-pilot. The full variant sits in the desktop sidebar (with its shortcut); the compact one in the phone header. */
export function CopilotButton({ onOpen, compact = false }: { onOpen: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <button type="button" onClick={onOpen} aria-label="Ask Vibey"
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200">
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }
  return (
    <button type="button" onClick={onOpen}
      className="mx-3 mt-3 flex h-11 cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-[13px] font-semibold text-neutral-900 hover:bg-neutral-100">
      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" aria-hidden /> Ask Vibey</span>
      <kbd className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">Ctrl K</kbd>
    </button>
  );
}
