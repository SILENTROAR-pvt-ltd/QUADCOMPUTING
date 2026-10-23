'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Reveals a reply a few words at a time, the way a live answer streams in: about 30 words a second, and never more than
 * about two seconds for a long reply. The whole text at once when the guest prefers reduced motion or it is not active.
 * Returns what is shown so far, the newest run of words on its own (so it can fade in), and whether it has finished.
 */
export function useTypewriter(text: string, active: boolean, onDone?: () => void) {
  const calm = useReducedMotion();
  const words = useMemo(() => text.match(/\s*\S+\s*/g) ?? [text], [text]);
  const live = active && !calm;
  const [shown, setShown] = useState(live ? 0 : words.length);
  const step = Math.max(1, Math.ceil(words.length / 60));

  useEffect(() => {
    if (!live) { setShown(words.length); return; }
    const id = window.setInterval(() => setShown((n) => Math.min(words.length, n + step)), 33);
    return () => window.clearInterval(id);
  }, [live, words.length, step]);

  const done = shown >= words.length;
  useEffect(() => { if (active && done) onDone?.(); }, [active, done, onDone]);

  const head = Math.max(0, shown - step);
  return { before: words.slice(0, head).join(''), latest: words.slice(head, shown).join(''), done, typing: live && !done, tick: shown };
}
