'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { rupees } from '@/lib/guest/cashback';

const WORD_IN = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

/** The line's words settle in one after another, like live text. Plain text when motion is reduced. */
function EnterText({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className="block truncate">{text}</span>;
  return (
    <motion.span key={text} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="block whitespace-nowrap">
      {text.split(' ').map((word, i) => (
        <motion.span key={`${i}-${word}`} variants={WORD_IN} className="inline-block whitespace-pre">{i === 0 ? word : ` ${word}`}</motion.span>
      ))}
    </motion.span>
  );
}

/** Rotates through a few short lines, so the banner reads as live without asking for attention. */
export function LiveLine({ lines }: { lines: string[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || lines.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % lines.length), 3600);
    return () => window.clearInterval(t);
  }, [reduce, lines.length]);
  const line = lines[i % lines.length];
  return (
    <span className="relative mt-1 block h-[18px] overflow-hidden text-[12px] font-normal leading-[18px] text-zinc-600">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={line} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="absolute inset-0 block">
          <EnterText text={line} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The amount, which eases into place whenever it changes. Lining figures: the serif draws uneven old-style numerals. */
export function Amount({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: -4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontVariantNumeric: 'lining-nums tabular-nums' }}
      className="inline-block text-[17px] font-bold tracking-tight"
    >
      {rupees(value)}
    </motion.span>
  );
}
