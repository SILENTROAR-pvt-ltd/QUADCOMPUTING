'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChefHat, Send, ShieldCheck } from 'lucide-react';

const STEPS = [
  { Icon: ShieldCheck, text: 'Checking the kitchen is open', at: 0 },
  { Icon: Send, text: 'Sending your order', at: 600 },
  { Icon: ChefHat, text: 'Handing it to the chef', at: 1500 },
];

/**
 * While the order travels: the review dims and three short steps tick past, so the wait reads as progress and nothing
 * can be tapped twice. The steps are paced by time, not by the server; the real answer replaces the overlay.
 */
export function SendingOverlay({ show, roomMode = false }: { show: boolean; roomMode?: boolean }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!show) { setStage(0); return; }
    const timers = STEPS.map((s, i) => setTimeout(() => setStage(i), s.at));
    return () => timers.forEach(clearTimeout);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          role="status" aria-live="polite" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-[inherit] bg-white/92 px-6 backdrop-blur-sm">
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-[#0A3222] text-white shadow-[0_16px_32px_-14px_rgba(10,50,34,0.8)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#0A3222]/20" />
            <Send className="h-6 w-6" aria-hidden />
          </span>
          <div className="w-full max-w-[280px] space-y-2.5">
            {STEPS.map((s, i) => {
              const done = i < stage; const now = i === stage;
              return (
                <motion.p key={s.text} initial={{ opacity: 0.4, x: -4 }} animate={{ opacity: i <= stage ? 1 : 0.4, x: 0 }} className="flex items-center gap-2.5 text-sm text-zinc-800">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : now ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : now ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <s.Icon className="h-3.5 w-3.5" aria-hidden />}
                  </span>
                  <span className={now ? 'font-semibold' : ''}>{s.text}</span>
                </motion.p>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-zinc-500">{roomMode ? 'It goes on your room bill; nothing to pay now.' : 'A moment. You will see it live on your bill next.'}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
