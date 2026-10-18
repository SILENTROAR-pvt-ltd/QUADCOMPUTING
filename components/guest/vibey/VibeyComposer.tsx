'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Sparkles } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';

interface VibeyComposerProps {
  chips: string[];
  sending: boolean;
  onSend: (text: string) => void;
}

/**
 * The message card: a promise strip on top, the field, then quick-ask chips (built by code, not the model) beside the
 * send button. The whole card glows softly while the guest types.
 */
export function VibeyComposer({ chips, sending, onSend }: VibeyComposerProps) {
  const [text, setText] = useState('');
  const ready = Boolean(text.trim()) && !sending;
  const submit = (value: string) => {
    if (!value.trim() || sending) return;
    onSend(value);
    setText('');
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(text); }}
      className="shrink-0 overflow-hidden rounded-[22px] bg-white shadow-[0_18px_44px_-26px_rgba(24,24,27,0.5)] ring-1 ring-black/[0.06] transition-shadow focus-within:shadow-[0_0_0_5px_rgba(251,146,60,0.12),0_18px_44px_-26px_rgba(24,24,27,0.5)] focus-within:ring-orange-200">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 px-3.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-zinc-600">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
          <span className="truncate">Fills your tray · you confirm</span>
        </span>
        <span className="shrink-0 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Live menu</span>
      </div>

      <label htmlFor="vibey-input" className="sr-only">Message Vibey</label>
      <input id="vibey-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoComplete="off" enterKeyHint="send"
        placeholder='Ask for a dish or a craving… "2 cold coffee"'
        className="h-12 w-full bg-transparent px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400" />

      <div className="flex items-center gap-2 px-2.5 pb-2.5">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" role="list" aria-label="Quick asks">
          {chips.map((c) => (
            <button key={c} type="button" role="listitem" disabled={sending} onClick={() => submit(c)}
              className="h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 ring-1 ring-black/[0.06] transition-colors hover:bg-white hover:ring-black/15 disabled:opacity-50">
              {c}
            </button>
          ))}
        </div>
        <motion.button type="submit" {...press} disabled={!ready} aria-label="Send"
          className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${ready
            ? 'bg-gradient-to-br from-zinc-900 to-zinc-700 text-white shadow-[0_8px_18px_-8px_rgba(244,63,94,0.7)]'
            : 'bg-zinc-100 text-zinc-400'}`}>
          <ArrowUp className="h-[18px] w-[18px]" />
        </motion.button>
      </div>
    </form>
  );
}
