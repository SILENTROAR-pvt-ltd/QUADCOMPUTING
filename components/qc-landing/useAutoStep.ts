'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A story that steps itself while it is on screen: after `ms(i)` the next step comes up, and after the last the first.
 * Choosing a step hands control to the reader for good. `advance` moves on early (when a recording ends before its time).
 * Without JavaScript or with reduced motion nothing runs and step one simply stands.
 */
export function useAutoStep(count: number, ms: (i: number) => number, threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [touched, setTouched] = useState(false);
  const [calm, setCalm] = useState(false);
  const running = inView && !touched && !calm;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCalm(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const msRef = useRef(ms);
  msRef.current = ms;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % count), msRef.current(active));
    return () => clearTimeout(t);
  }, [running, active, count]);

  const choose = useCallback((i: number) => { setActive(i); setTouched(true); }, []);
  const advance = useCallback(() => setActive((a) => (a + 1) % count), [count]);

  return { ref, active, choose, advance, running, inView, calm };
}
