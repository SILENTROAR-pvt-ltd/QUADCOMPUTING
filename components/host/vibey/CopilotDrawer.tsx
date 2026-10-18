'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Sparkles, X } from 'lucide-react';
import { chipsFor } from '@/lib/vibey/host/chips';
import { CopilotCard } from './CopilotCards';
import type { useCopilot } from './useCopilot';

interface CopilotDrawerProps {
  copilot: ReturnType<typeof useCopilot>;
  tab: string;
  onNavigate: (tab: string) => void;
  onClose: () => void;
}

/** The co-pilot panel: a right-hand drawer on desktop, a full sheet on phones. Answers are cards, read-only. */
export function CopilotDrawer({ copilot, tab, onNavigate, onClose }: CopilotDrawerProps) {
  const [text, setText] = useState('');
  const feed = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const last = copilot.messages[copilot.messages.length - 1];
  const chips = last?.reply?.chips ?? chipsFor(tab);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' }); }, [copilot.messages.length, copilot.sending]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ask = (value: string) => { if (value.trim() && !copilot.sending) { void copilot.send(value); setText(''); } };
  const go = (t: string) => { onNavigate(t); onClose(); };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-neutral-950/30" onClick={onClose}>
      <motion.aside role="dialog" aria-modal="true" aria-labelledby="copilot-title" onClick={(e) => e.stopPropagation()}
        initial={{ x: 40, opacity: 0.6 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        className="flex h-full w-full flex-col bg-[#faf9f6] shadow-2xl sm:w-[420px] sm:border-l sm:border-neutral-200">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3.5">
          <div>
            <h2 id="copilot-title" className="flex items-center gap-2 text-[15px] font-semibold text-neutral-950"><Sparkles className="h-4 w-4" aria-hidden /> Ask Vibey</h2>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">Read-only. Numbers come from your settled bills and records.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </header>

        <div ref={feed} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {copilot.messages.length === 0 && <p className="text-[13px] text-neutral-600">Ask about sales, profit, top dishes, stock, dues, a bill, tables, deliveries, reservations or guests.</p>}
          {copilot.messages.map((m) => m.role === 'host' ? (
            <p key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 px-3.5 py-2 text-[13.5px] text-white">{m.text}</p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <p className="text-[13.5px] leading-snug text-neutral-800">{m.text}</p>
              {m.reply?.cards.map((c, i) => <CopilotCard key={i} card={c} onNavigate={go} />)}
            </div>
          ))}
          {copilot.sending && <p className="text-[12.5px] text-neutral-500">Reading your numbers…</p>}
        </div>

        <div className="space-y-2 border-t border-neutral-200 bg-white p-3">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {chips.map((c) => (
              <button key={c} type="button" disabled={copilot.sending} onClick={() => ask(c)}
                className="h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-neutral-200 px-3 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">{c}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex items-center gap-2">
            <label htmlFor="copilot-input" className="sr-only">Ask Vibey about your venue</label>
            <input id="copilot-input" ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoComplete="off"
              placeholder="How did we do today?" className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-[15px] outline-none focus:border-neutral-900" />
            <button type="submit" disabled={copilot.sending || !text.trim()} aria-label="Ask"
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300"><ArrowUp className="h-4 w-4" /></button>
          </form>
        </div>
      </motion.aside>
    </div>
  );
}
