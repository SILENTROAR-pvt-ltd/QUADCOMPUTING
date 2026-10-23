'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Sparkles } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';

interface VibeyComposerProps {
  sending: boolean;
  onSend: (text: string) => void;
}

/** Ideas that rotate in the empty field, so a guest sees what Vibey can do before typing a word. */
const IDEAS = ['"2 cold coffee, less sugar"', '"Something spicy under ₹300"', '"What goes well with it?"', '"Kuch meetha chahiye"', '"Dinner for 4"'];

/**
 * The message field: a white capsule drawn with one crisp ink line, ink text and the ink send button, the placeholder
 * cycling through things to ask, and the promise beneath it (Vibey fills the tray, the guest places the order).
 */
export function VibeyComposer({ sending, onSend }: VibeyComposerProps) {
  const calm = useReducedMotion();
  const [text, setText] = useState('');
  const [idea, setIdea] = useState(0);
  const ready = Boolean(text.trim()) && !sending;

  useEffect(() => {
    if (calm || text) return;
    const id = window.setInterval(() => setIdea((i) => (i + 1) % IDEAS.length), 3200);
    return () => window.clearInterval(id);
  }, [calm, text]);

  const submit = (value: string) => {
    if (!value.trim() || sending) return;
    onSend(value);
    setText('');
  };
  return (
    <div className="shrink-0">
      <form onSubmit={(e) => { e.preventDefault(); submit(text); }}
        className="flex items-center gap-2 rounded-[26px] border border-[#141414] bg-white p-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(20,20,20,0.1)]">
        <Sparkles className="h-4 w-4 shrink-0 text-[#141414]" aria-hidden />
        <label htmlFor="vibey-input" className="sr-only">Message Vibey</label>
        <input id="vibey-input" dir="auto" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoComplete="off" enterKeyHint="send"
          placeholder={`Try ${IDEAS[idea]}`}
          className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-[#141414] outline-none placeholder:text-[#77736a]" />
        <motion.button type="submit" {...press} disabled={!ready} aria-label="Send"
          className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${ready
            ? 'bg-[#141414] text-white'
            : 'bg-[#141414]/[0.08] text-[#141414]/35'}`}>
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </motion.button>
      </form>
      <p className="mt-1.5 text-center text-[10.5px] tracking-wide text-[#6f6a5c]">Fills your tray from the live menu · you place the order</p>
    </div>
  );
}
